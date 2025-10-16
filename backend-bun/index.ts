import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import crypto from 'crypto'

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

  async login(studentId: string, password: string, useHash: boolean = false): Promise<void> {
    // Visit homepage first
    await fetch(`${this.baseUrl}/`)

    // Get captcha (skip OCR for now, use empty string)
    const passcode = ''

    // Prepare password
    let passwordHash: string
    if (useHash) {
      passwordHash = password
    } else {
      const pwd = password || `Bjtu@${studentId}`
      passwordHash = crypto.createHash('md5').update(pwd).digest('hex')
    }

    // Login
    const formData = new URLSearchParams({
      login: 'main_2',
      qxkt_type: '',
      qxkt_url: '',
      username: studentId,
      password: passwordHash,
      passcode: passcode
    })

    const response = await fetch(`${this.baseUrl}/s.shtml`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'follow'
    })

    // Extract cookie
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      const match = setCookie.match(/JSESSIONID=([^;]+)/)
      if (match) {
        this.cookie['JSESSIONID'] = match[1]
      }
    }

    const text = await response.text()
    if (!response.ok || text.includes('alert(')) {
      throw new Error('Login failed')
    }
  }

  private async request(url: string, referer?: string): Promise<any> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cookie': `JSESSIONID=${this.cookie['JSESSIONID']}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Host': '123.121.147.7:88'
    }

    if (referer) headers['Referer'] = referer
    if (this.sessionId) headers['sessionId'] = this.sessionId

    const response = await fetch(url, { headers })
    return response.json()
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
    message: 'BJTU Homework Tracker API - NextGen',
    stack: 'Bun + Hono',
    version: '3.0'
  })
})

app.post('/api/homework', async (c) => {
  try {
    const body = await c.req.json()
    const login = LoginSchema.parse(body)
    const filters = FilterSchema.parse(body)

    const client = new BJTUClient()

    // Login
    await client.login(login.student_id, login.password || '', login.use_hash || false)

    // Get data
    const semester = await client.getCurrentSemester()
    await client.getSessionId()
    const courses = await client.getCourses(semester)

    // Get all homework
    const allHomework: any[] = []
    for (const course of courses) {
      const homework = await client.getHomeworkForCourse(course, semester)
      allHomework.push(...homework)
    }

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

    return c.json({
      success: true,
      data: filtered,
      total: filtered.length,
      semester
    })

  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500)
  }
})

export default app

// For Bun
const port = process.env.PORT || 3001
console.log(`🚀 Server running on http://localhost:${port}`)
