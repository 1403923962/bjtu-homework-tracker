/**
 * BJTU API Client using Playwright for all requests
 * This maintains the browser session throughout all API calls
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { AutoLogin } from './login'

export class BJTUClientPlaywright {
  private baseUrl = 'http://123.121.147.7:88/ve'
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private sessionId = ''

  async login(studentId: string, password: string): Promise<void> {
    // Use automated login with Playwright + OCR
    const autoLogin = new AutoLogin()
    const pwd = password || `Bjtu@${studentId}`

    console.log('使用自动化登录 (Playwright + ddddocr)...')

    // Login and get the browser context
    const { browser, context, page } = await autoLogin.loginWithContext(studentId, pwd)

    this.browser = browser
    this.context = context
    this.page = page

    console.log('登录成功！浏览器session已建立')
  }

  private async apiCall(url: string, referer?: string): Promise<any> {
    if (!this.page) {
      throw new Error('未登录 - 请先调用login()')
    }

    console.log(`📤 API调用 (Playwright): ${url}`)
    if (referer) console.log(`🔗 Referer: ${referer}`)

    try {
      // Use page.evaluate to make fetch call within the browser context
      const response = await this.page.evaluate(async ({ apiUrl, refererUrl }) => {
        const headers: Record<string, string> = {
          'X-Requested-With': 'XMLHttpRequest'
        }
        if (refererUrl) {
          headers['Referer'] = refererUrl
        }

        const res = await fetch(apiUrl, { headers })
        return {
          status: res.status,
          text: await res.text()
        }
      }, { apiUrl: url, refererUrl: referer })

      console.log(`📥 响应状态: ${response.status}`)
      console.log(`📄 响应预览: ${response.text.substring(0, 200)}...`)

      try {
        return JSON.parse(response.text)
      } catch (e) {
        console.error('❌ JSON解析失败:', response.text.substring(0, 500))
        throw new Error(`API返回了非JSON内容: ${response.text.substring(0, 200)}`)
      }
    } catch (error: any) {
      console.error(`❌ API调用失败: ${error.message}`)
      throw error
    }
  }

  async getCurrentSemester(): Promise<string> {
    const url = `${this.baseUrl}/back/rp/common/teachCalendar.shtml?method=queryCurrentXq`
    const data = await this.apiCall(url)
    return data.result[0].xqCode
  }

  async getSessionId(): Promise<string> {
    const url = `${this.baseUrl}/back/coursePlatform/message.shtml?method=getArticleList`
    const data = await this.apiCall(url)
    this.sessionId = data.sessionId || ''
    return this.sessionId
  }

  async getCourses(semester: string): Promise<any[]> {
    const url = `${this.baseUrl}/back/coursePlatform/course.shtml?method=getCourseList&pagesize=100&page=1&xqCode=${semester}`
    const referer = `${this.baseUrl}/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex`
    const data = await this.apiCall(url, referer)
    return data.courseList || []
  }

  async getHomeworkForCourse(course: any, semester: string): Promise<any[]> {
    const homeworkList: any[] = []
    const baseUrl = `${this.baseUrl}/back/coursePlatform/homeWork.shtml`

    // Three types: 0=homework, 1=report, 2=experiment
    for (let type = 0; type < 3; type++) {
      const url = `${baseUrl}?method=getHomeWorkList&cId=${course.id}&subType=${type}&page=1&pagesize=100`

      try {
        const data = await this.apiCall(url)
        if (data.message !== '没有数据' && data.courseNoteList) {
          for (const hw of data.courseNoteList) {
            hw.course_name = course.name
          }
          homeworkList.push(...data.courseNoteList)
        }
      } catch (e) {
        console.log(`⚠️  获取作业失败 (type=${type}):`, (e as Error).message)
        continue
      }
    }

    return homeworkList
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      console.log('浏览器已关闭')
    }
  }
}
