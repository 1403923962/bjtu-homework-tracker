import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import crypto from 'crypto'
import { AutoLogin } from './login'
import { BJTUClientPlaywright } from './bjtu_client_playwright'
import { CacheManager } from './cache_manager'
import { IgnoredHomeworkManager } from './ignored_homework'

const app = new Hono()

// CORS middleware
app.use('/*', cors())

// Initialize cache manager and ignored homework manager
const cacheManager = new CacheManager('./cache')
const ignoredManager = new IgnoredHomeworkManager('./cache/ignored')

// Types and Schemas
const LoginSchema = z.object({
  student_id: z.string(),
  password: z.string().optional(),
  use_hash: z.boolean().optional().default(false)
})

const FilterSchema = z.object({
  finish_status: z.enum(['all', 'finished', 'unfinished']).optional().default('unfinished'),
  course_keywords: z.array(z.string()).optional().default([]),
  ignore_expired_days: z.number().optional().default(15),
  ignore_unexpired_days: z.number().optional().default(90)
})

// BJTU API Client
class BJTUClient {
  private baseUrl = 'http://123.121.147.7:88/ve'
  private cookie: Record<string, string> = {}
  private sessionId = ''

  async login(studentId: string, password: string): Promise<void> {
    // Use automated login with Playwright + OCR
    const autoLogin = new AutoLogin()
    const pwd = password || `Bjtu@${studentId}` // Default password if empty

    console.log('使用自动化登录 (Playwright + Tesseract.js)...')
    this.cookie = await autoLogin.login(studentId, pwd)
    console.log('登录成功！')
  }

  private async request(url: string, referer?: string): Promise<any> {
    // Build cookie string from all available cookies
    const cookieParts: string[] = []
    for (const [name, value] of Object.entries(this.cookie)) {
      cookieParts.push(`${name}=${value}`)
    }
    const cookieString = cookieParts.join('; ')

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cookie': cookieString,
      'X-Requested-With': 'XMLHttpRequest',
      'Host': '123.121.147.7:88'
    }

    if (referer) headers['Referer'] = referer
    if (this.sessionId) headers['sessionId'] = this.sessionId

    console.log(`📤 请求: ${url}`)
    console.log(`🍪 Cookie: ${cookieString.substring(0, 100)}...`)

    const response = await fetch(url, { headers })
    const text = await response.text()

    console.log(`📥 响应状态: ${response.status}`)
    console.log(`📄 响应预览: ${text.substring(0, 200)}...`)

    try {
      return JSON.parse(text)
    } catch (e) {
      console.error('❌ JSON解析失败，返回的是HTML:', text.substring(0, 500))
      throw new Error(`API返回了HTML而不是JSON: ${text.substring(0, 200)}`)
    }
  }

  async getCurrentSemester(): Promise<string> {
    const url = `${this.baseUrl}/back/rp/common/teachCalendar.shtml?method=queryCurrentXq`
    const data = await this.request(url)
    return data.result[0].xqCode
  }

  async getSessionId(): Promise<string> {
    const url = `${this.baseUrl}/back/coursePlatform/message.shtml?method=getArticleList`
    const referer = `${this.baseUrl}/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex`
    const data = await this.request(url, referer)
    this.sessionId = data.sessionId || ''
    return this.sessionId
  }

  async getCourses(semester: string): Promise<any[]> {
    const url = `${this.baseUrl}/back/coursePlatform/course.shtml?method=getCourseList&pagesize=100&page=1&xqCode=${semester}`
    const referer = `${this.baseUrl}/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex`
    const data = await this.request(url, referer)
    return data.courseList || []
  }

  async getHomeworkForCourse(course: any, semester: string): Promise<any[]> {
    const homeworkList: any[] = []
    const baseUrl = `${this.baseUrl}/back/coursePlatform/homeWork.shtml`

    // Three types: 0=homework, 1=report, 2=experiment
    for (let type = 0; type < 3; type++) {
      const url = `${baseUrl}?method=getHomeWorkList&cId=${course.id}&subType=${type}&page=1&pagesize=100`
      const referer = `${this.baseUrl}/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatform&courseId=${course.course_num}&dataSource=1&cId=${course.id}&xkhId=${course.fz_id}&xqCode=${semester}&teacherId=${course.teacher_id}`

      try {
        const data = await this.request(url, referer)
        if (data.message !== '没有数据' && data.courseNoteList) {
          for (const hw of data.courseNoteList) {
            hw.course_name = course.name
          }
          homeworkList.push(...data.courseNoteList)
        }
      } catch (e) {
        continue
      }
    }

    return homeworkList
  }
}

// Helper functions
function filterByStatus(status: string, homework: any): boolean {
  if (status === 'all') return true
  if (status === 'finished') return homework.subStatus === '已提交'
  if (status === 'unfinished') return homework.subStatus === '未提交'
  return true
}

function filterByTime(ignoredExpired: number, ignoreUnexpired: number, homework: any): boolean {
  const endTime = homework.end_time
  if (!endTime) return true

  const due = new Date(endTime)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  // Too old
  if (diff < 0 && Math.abs(days) > ignoredExpired) return false

  // Too far in future
  if (diff > 0 && days > ignoreUnexpired) return false

  return true
}

function cleanHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim() || '无详情'
}

// Routes
app.get('/', (c) => {
  return c.json({
    message: 'BJTU Homework Tracker API - Desktop Edition',
    stack: 'Bun + Hono + Playwright + Tesseract.js',
    version: 'Desktop-1.0'
  })
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'homework-query'
  })
})

// Get cached homework data (fast, returns immediately)
app.post('/api/homework-cache', async (c) => {
  try {
    const body = await c.req.json()
    const login = LoginSchema.parse(body)

    console.log(`📦 查询缓存: ${login.student_id}`)

    const cache = await cacheManager.get(login.student_id)

    if (!cache) {
      return c.json({
        success: false,
        error: 'No cache found',
        message: '无缓存数据，请先刷新'
      }, 404)
    }

    const age = cacheManager.getAge(login.student_id)
    const ageMinutes = age ? Math.floor(age / (1000 * 60)) : 0

    // Filter out ignored homework
    const ignoredList = await ignoredManager.getIgnoredList(login.student_id)
    const ignoredIds = new Set(ignoredList.map(item => item.homework_id))
    const filteredData = cache.data.filter((hw: any) => !ignoredIds.has(hw.id))

    console.log(`🔍 过滤掉 ${ignoredIds.size} 个忽略作业，剩余 ${filteredData.length} 个`)

    return c.json({
      success: true,
      data: filteredData,
      summary: cache.summary,
      semester: cache.semester,
      cached: true,
      timestamp: cache.timestamp,
      age_minutes: ageMinutes
    })
  } catch (error: any) {
    console.error(`❌ 错误: ${error.message}`)
    return c.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500)
  }
})

app.post('/api/homework-query', async (c) => {
  const client = new BJTUClientPlaywright()

  try {
    const body = await c.req.json()
    const login = LoginSchema.parse(body)
    const filters = FilterSchema.parse(body)

    console.log(`🔐 正在登录...`)
    // Login with new working implementation
    await client.login(login.student_id, login.password || '')
    console.log(`✅ 登录成功`)

    // Get data
    console.log(`📅 获取当前学期...`)
    const semester = await client.getCurrentSemester()
    console.log(`✅ 当前学期: ${semester}`)

    console.log(`📚 获取课程列表...`)
    const courses = await client.getCourses(semester)
    console.log(`✅ 找到 ${courses.length} 门课程`)

    // Get all homework
    const allHomework: any[] = []
    for (const course of courses) {
      console.log(`📖 正在获取课程「${course.name}」的作业...`)
      try {
        const homework = await client.getHomeworkForCourse(course, semester)
        console.log(`  └─ 找到 ${homework.length} 个任务`)
        allHomework.push(...homework)
      } catch (e: any) {
        console.log(`  └─ ⚠️  获取失败: ${e.message}`)
      }
    }

    console.log(`✅ 总共找到 ${allHomework.length} 个作业`)

    // Calculate days left for each homework
    const now = new Date()
    allHomework.forEach(hw => {
      if (hw.end_time) {
        const deadline = new Date(hw.end_time)
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        hw.daysLeft = daysLeft
        hw.isOverdue = daysLeft < 0
        hw.isUrgent = daysLeft >= 0 && daysLeft <= 3
      }
    })

    // Apply filters
    const filtered = allHomework
      .filter(hw => filterByStatus(filters.finish_status, hw))
      .filter(hw => filterByTime(filters.ignore_expired_days, filters.ignore_unexpired_days, hw))
      .map(hw => ({
        id: String(hw.id || ''),
        title: hw.title || '',
        course_name: hw.course_name || '',
        content: cleanHtml(hw.content || ''),
        due_time: hw.end_time || null,
        submit_status: hw.subStatus || '未提交',
        submit_count: hw.submitCount || 0,
        total_count: hw.allCount || 0,
        create_date: hw.open_date || '',
        daysLeft: hw.daysLeft,
        isOverdue: hw.isOverdue,
        isUrgent: hw.isUrgent
      }))

    console.log(`🔍 过滤后剩余 ${filtered.length} 个作业`)

    // Calculate summary statistics
    const summary = {
      total: allHomework.length,
      unsubmitted: allHomework.filter(hw => hw.subStatus === '未提交').length,
      submitted: allHomework.filter(hw => hw.subStatus === '已提交').length,
      overdue: allHomework.filter(hw => hw.isOverdue && hw.subStatus === '未提交').length,
      urgent: allHomework.filter(hw => hw.isUrgent && hw.subStatus === '未提交').length
    }

    // Close browser
    await client.close()
    console.log(`🔒 浏览器已关闭`)

    // Save to cache
    await cacheManager.save(login.student_id, filtered, summary, semester)

    // Filter out ignored homework
    const ignoredList = await ignoredManager.getIgnoredList(login.student_id)
    const ignoredIds = new Set(ignoredList.map(item => item.homework_id))
    const filteredData = filtered.filter(hw => !ignoredIds.has(hw.id))

    console.log(`🔍 过滤掉 ${ignoredIds.size} 个忽略作业，最终返回 ${filteredData.length} 个`)

    return c.json({
      success: true,
      data: filteredData,
      summary,
      semester,
      cached: false,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error(`❌ 错误: ${error.message}`)
    // Make sure to close browser on error
    await client.close().catch(() => {})

    return c.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500)
  }
})

// Ignore homework API
app.post('/api/ignore-homework', async (c) => {
  try {
    const body = await c.req.json()
    const { student_id, homework_id, course_name, title } = body

    if (!student_id || !homework_id) {
      return c.json({
        success: false,
        error: 'Missing required fields: student_id, homework_id'
      }, 400)
    }

    await ignoredManager.addIgnored(student_id, homework_id, course_name || '', title || '')

    return c.json({
      success: true,
      message: 'Homework ignored successfully'
    })
  } catch (error: any) {
    console.error(`❌ 忽略作业失败: ${error.message}`)
    return c.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500)
  }
})

// Unignore homework API
app.post('/api/unignore-homework', async (c) => {
  try {
    const body = await c.req.json()
    const { student_id, homework_id } = body

    if (!student_id || !homework_id) {
      return c.json({
        success: false,
        error: 'Missing required fields: student_id, homework_id'
      }, 400)
    }

    await ignoredManager.removeIgnored(student_id, homework_id)

    return c.json({
      success: true,
      message: 'Homework unignored successfully'
    })
  } catch (error: any) {
    console.error(`❌ 取消忽略失败: ${error.message}`)
    return c.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500)
  }
})

// Get ignored homeworks list
app.get('/api/ignored-homeworks/:student_id', async (c) => {
  try {
    const studentId = c.req.param('student_id')

    if (!studentId) {
      return c.json({
        success: false,
        error: 'Missing student_id'
      }, 400)
    }

    const ignoredList = await ignoredManager.getIgnoredList(studentId)

    return c.json({
      success: true,
      data: ignoredList
    })
  } catch (error: any) {
    console.error(`❌ 获取忽略列表失败: ${error.message}`)
    return c.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500)
  }
})

export default app

// For Bun
const port = process.env.PORT || 5000
console.log(`🚀 BJTU Homework Tracker API (Desktop Edition)`)
console.log(`📡 Server running on http://localhost:${port}`)
console.log(`🔧 Stack: Bun + Hono + Playwright + Tesseract.js`)
console.log(`💾 Cache: Enabled (./cache)`)
console.log(`🙈 Ignored: Enabled (./cache/ignored)`)
console.log(`📋 Endpoints:`)
console.log(`   - GET  /health`)
console.log(`   - POST /api/homework-cache        (快速返回缓存数据)`)
console.log(`   - POST /api/homework-query        (完整刷新并缓存)`)
console.log(`   - POST /api/ignore-homework       (忽略作业)`)
console.log(`   - POST /api/unignore-homework     (取消忽略)`)
console.log(`   - GET  /api/ignored-homeworks/:id (获取忽略列表)`)
