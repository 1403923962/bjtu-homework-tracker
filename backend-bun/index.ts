import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import crypto from 'crypto'
import { AutoLogin } from './login'
import { BJTUClientPlaywright } from './bjtu_client_playwright'

const app = new Hono()

// CORS middleware
app.use('/*', cors())

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

app.post('/api/homework-query', async (c) => {
  const client = new BJTUClientPlaywright()

  try {
    const body = await c.req.json()
    const login = LoginSchema.parse(body)
    const filters = FilterSchema.parse(body)

    // Login (no longer need use_hash parameter)
    await client.login(login.student_id, login.password || '')

    // Get data
    const semester = await client.getCurrentSemester()
    // SKIP getSessionId() - that endpoint seems to have different auth requirements
    //await client.getSessionId()
    const courses = await client.getCourses(semester)

    console.log(`📚 找到 ${courses.length} 门课程`)

    // Get all homework
    const allHomework: any[] = []
    for (const course of courses) {
      console.log(`正在获取课程「${course.name}」的作业...`)
      const homework = await client.getHomeworkForCourse(course, semester)
      console.log(`  └─ 找到 ${homework.length} 个作业`)
      allHomework.push(...homework)
    }

    console.log(`✅ 总共找到 ${allHomework.length} 个作业`)

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
        submit_status: hw.subStatus || '',
        submit_count: hw.submitCount || 0,
        total_count: hw.allCount || 0,
        create_date: hw.open_date || ''
      }))

    console.log(`🔍 过滤后剩余 ${filtered.length} 个作业`)

    // Close browser
    await client.close()

    return c.json({
      success: true,
      data: filtered,
      total: filtered.length,
      semester
    })

  } catch (error: any) {
    // Make sure to close browser on error
    await client.close().catch(() => {})

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
console.log(`📋 Endpoints:`)
console.log(`   - GET  /health`)
console.log(`   - POST /api/homework-query`)
