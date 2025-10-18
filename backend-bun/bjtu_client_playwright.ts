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

    // Wait for page JavaScript to fully load and sessionId to be initialized
    console.log('等待页面JavaScript完全加载并初始化sessionId...')
    await this.page.waitForTimeout(5000)  // Wait 5 seconds for all scripts to execute
    await this.page.waitForLoadState('networkidle')

    // Wait for sessionId to stabilize (it changes over time on the page)
    console.log('等待sessionId稳定...')
    let previousSessionId = ''
    let stableCount = 0

    for (let i = 0; i < 10; i++) {
      await this.page.waitForTimeout(1000)  // Wait 1 second between checks
      await this.getSessionIdFromPage()

      if (this.sessionId === previousSessionId) {
        stableCount++
        if (stableCount >= 3) {
          console.log(`✅ SessionId已稳定: ${this.sessionId}`)
          break
        }
      } else {
        console.log(`🔄 SessionId变化: ${previousSessionId.substring(0, 8)}... -> ${this.sessionId.substring(0, 8)}...`)
        previousSessionId = this.sessionId
        stableCount = 0
      }
    }

    if (!this.sessionId) {
      // Fallback
      await this.getSessionIdFromAPI()
    }
  }

  /**
   * Get sessionId by calling an API that returns it in the response
   */
  private async getSessionIdFromAPI(): Promise<void> {
    if (!this.page) {
      throw new Error('页面未初始化')
    }

    try {
      console.log('尝试从页面JavaScript中获取sessionId...')

      // Method 1: Extract from page JavaScript (MOST IMPORTANT - this is what works for homework API!)
      await this.getSessionIdFromPage()

      if (this.sessionId) {
        console.log(`✅ 从页面脚本获取sessionId: ${this.sessionId}`)
        return
      }

      // Method 2: Check cookies (backup)
      console.log('页面脚本中无sessionId，尝试从Cookie获取...')
      const cookies = await this.context?.cookies()
      if (cookies) {
        const sessionCookie = cookies.find(c => c.name === 'sessionId' || c.name.toLowerCase().includes('session'))
        if (sessionCookie && sessionCookie.value.match(/^[A-F0-9]{32}$/i)) {
          this.sessionId = sessionCookie.value
          console.log(`✅ 从Cookie获取sessionId: ${this.sessionId}`)
          return
        }
      }

      // Method 3: Check localStorage and sessionStorage
      const storageSessionId = await this.page.evaluate(() => {
        // Check localStorage
        const localStorageSessionId = localStorage.getItem('sessionId')
        if (localStorageSessionId && localStorageSessionId.match(/^[A-F0-9]{32}$/i)) {
          return localStorageSessionId
        }

        // Check sessionStorage
        const sessionStorageSessionId = sessionStorage.getItem('sessionId')
        if (sessionStorageSessionId && sessionStorageSessionId.match(/^[A-F0-9]{32}$/i)) {
          return sessionStorageSessionId
        }

        // Check all localStorage keys for sessionId pattern
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key) {
            const value = localStorage.getItem(key)
            if (value && value.match(/^[A-F0-9]{32}$/i)) {
              return value
            }
          }
        }

        return null
      })

      if (storageSessionId) {
        this.sessionId = storageSessionId
        console.log(`✅ 从浏览器存储获取sessionId: ${this.sessionId}`)
        return
      }

      // Method 4: Try to extract from URL or page
      console.log('浏览器存储中无sessionId，尝试从URL提取...')
      await this.extractSessionIdFromUrl()
    } catch (error: any) {
      console.error('❌ 获取sessionId失败:', error.message)
      throw new Error('无法获取sessionId，请重新登录')
    }
  }

  /**
   * Extract sessionId from URL after successful login
   */
  private async extractSessionIdFromUrl(): Promise<void> {
    if (!this.page) {
      throw new Error('页面未初始化')
    }

    try {
      const currentUrl = this.page.url()
      console.log(`当前URL: ${currentUrl}`)

      // Method 1: Try to extract from URL first
      let match = currentUrl.match(/sessionId=([A-F0-9]{32})/i)

      if (match) {
        this.sessionId = match[1]
        console.log(`✅ 从URL获取sessionId: ${this.sessionId}`)
        return
      }

      // Method 2: Extract from page JavaScript (most reliable for BJTU)
      console.log('URL中无sessionId，尝试从页面脚本提取...')
      await this.getSessionIdFromPage()

      if (this.sessionId) {
        return // Success
      }

      // Method 3: Try to trigger a page action that includes sessionId
      console.log('尝试通过页面交互获取sessionId...')
      const sessionIdFromAction = await this.page.evaluate(() => {
        // Try to find any AJAX call that might include sessionId
        const scripts = Array.from(document.querySelectorAll('script'))
        for (const script of scripts) {
          if (script.textContent) {
            // Look for XMLHttpRequest.setRequestHeader("sessionId", 'xxx')
            const headerMatch = script.textContent.match(/setRequestHeader\s*\(\s*["']sessionId["']\s*,\s*["']([A-F0-9]{32})["']/i)
            if (headerMatch) return headerMatch[1]

            // Look for sessionId: 'xxx' or sessionId='xxx'
            const varMatch = script.textContent.match(/sessionId\s*[:=]\s*["']([A-F0-9]{32})["']/i)
            if (varMatch) return varMatch[1]
          }
        }
        return null
      })

      if (sessionIdFromAction) {
        this.sessionId = sessionIdFromAction
        console.log(`✅ 从页面交互获取sessionId: ${this.sessionId}`)
        return
      }

      throw new Error('无法通过任何方法获取sessionId')
    } catch (error: any) {
      console.error('❌ 获取sessionId失败:', error.message)
      throw new Error('无法获取sessionId，请重新登录')
    }
  }

  /**
   * Backup method: Extract sessionId from page JavaScript
   */
  private async getSessionIdFromPage(): Promise<void> {
    if (!this.page) return

    // Check main page first - find ALL sessionIds
    let result = await this.page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      const patterns = [
        /setRequestHeader\s*\(\s*["']sessionId["']\s*,\s*["']([A-F0-9]{32})["']\s*\)/gi,
        /sessionId\s*:\s*['"]([A-F0-9]{32})['"]/gi,
        /sessionId\s*=\s*['"]([A-F0-9]{32})['"]/gi,
        /["']sessionId["']\s*,\s*["']([A-F0-9]{32})["']/gi
      ]

      const found: string[] = []
      let scriptsWithSessionId = 0

      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('sessionId')) {
          scriptsWithSessionId++
          for (const pattern of patterns) {
            const matches = [...script.textContent.matchAll(pattern)]
            matches.forEach(m => {
              if (m[1] && !found.includes(m[1])) {
                found.push(m[1])
              }
            })
          }
        }
      }

      return {
        sessionIds: found,
        scriptsWithSessionId,
        totalScripts: scripts.length,
        iframeCount: document.querySelectorAll('iframe').length,
        location: 'main'
      }
    })

    console.log(`🔍 调试: 主页面找到 ${result.totalScripts} 个script, ${result.scriptsWithSessionId} 个包含'sessionId', ${result.iframeCount || 0} 个iframe`)

    if (result.sessionIds && result.sessionIds.length > 0) {
      // Use the LAST sessionId (most recent one)
      this.sessionId = result.sessionIds[result.sessionIds.length - 1]
      if (result.sessionIds.length > 1) {
        console.log(`📋 找到 ${result.sessionIds.length} 个sessionId，使用最后一个: ${this.sessionId}`)
        console.log(`   所有ID: ${result.sessionIds.map(id => id.substring(0, 8) + '...').join(', ')}`)
      }
      return
    }

    // If not found in main page, check iframes
    const frames = this.page.frames()
    console.log(`🔍 检查 ${frames.length} 个frame...`)

    for (const frame of frames) {
      try {
        const frameResult = await frame.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script'))
          const patterns = [
            /setRequestHeader\s*\(\s*["']sessionId["']\s*,\s*["']([A-F0-9]{32})["']\s*\)/i,
            /sessionId\s*:\s*['"]([A-F0-9]{32})['"]/i,
            /sessionId\s*=\s*['"]([A-F0-9]{32})['"]/i,
            /["']sessionId["']\s*,\s*["']([A-F0-9]{32})["']/i,
            /sessionId[^A-F0-9]*([A-F0-9]{32})/i
          ]

          for (const script of scripts) {
            if (script.textContent && script.textContent.includes('sessionId')) {
              for (const pattern of patterns) {
                const match = script.textContent.match(pattern)
                if (match && match[1]) {
                  return match[1]
                }
              }
            }
          }
          return null
        })

        if (frameResult) {
          console.log(`✅ 在iframe中找到sessionId: ${frameResult}`)
          this.sessionId = frameResult
          return
        }
      } catch (e) {
        // Some iframes might not be accessible
        continue
      }
    }
  }

  private async apiCall(url: string, referer?: string): Promise<any> {
    if (!this.page) {
      throw new Error('未登录 - 请先调用login()')
    }

    // IMPORTANT: Always refresh sessionId before each API call
    // The page dynamically updates sessionId, so we need to extract it fresh each time
    console.log('🔄 重新提取最新的sessionId...')
    await this.getSessionIdFromPage()

    if (!this.sessionId) {
      console.warn('⚠️ sessionId未设置，尝试其他方法获取...')
      await this.getSessionIdFromAPI()
    }

    console.log(`📤 API调用 (浏览器上下文): ${url}`)
    if (referer) console.log(`🔗 Referer: ${referer}`)
    console.log(`🔑 SessionId Header: ${this.sessionId.substring(0, 8)}...`)

    try {
      // Use page.evaluate to make the API call in browser context
      // This automatically includes all cookies and session state
      const result = await this.page.evaluate(async ({ apiUrl, refererUrl, sessionId }) => {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', apiUrl, true)  // Use async
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
          xhr.setRequestHeader('sessionId', sessionId)  // ⭐ 关键：添加sessionId header
          xhr.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01')
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')

          if (refererUrl) {
            xhr.setRequestHeader('Referer', refererUrl)
          }

          xhr.onload = function() {
            resolve({
              status: xhr.status,
              text: xhr.responseText
            })
          }

          xhr.onerror = function() {
            resolve({
              status: 0,
              text: '',
              error: '网络错误'
            })
          }

          xhr.send()
        })
      }, { apiUrl: url, refererUrl: referer, sessionId: this.sessionId })

      console.log(`📥 响应状态: ${result.status}`)

      if (result.error) {
        throw new Error(`API请求失败: ${result.error}`)
      }

      if (result.status !== 200) {
        console.log(`📄 错误响应内容: ${result.text.substring(0, 500)}`)
        throw new Error(`API返回错误状态: ${result.status}`)
      }

      console.log(`📄 响应预览: ${result.text.substring(0, 200)}...`)

      try {
        const data = JSON.parse(result.text)

        // Check if API returned error
        if (data.STATUS === '1' && data.ERRMSG) {
          console.error(`❌ API错误: ${data.ERRMSG}`)
          throw new Error(`API错误: ${data.ERRMSG}`)
        }

        return data
      } catch (e) {
        if (e instanceof Error && (e.message.includes('API错误') || e.message.includes('Session'))) {
          throw e  // Re-throw API errors
        }
        console.error('❌ JSON解析失败:', result.text.substring(0, 500))
        throw new Error(`API返回了非JSON内容: ${result.text.substring(0, 200)}`)
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

  /**
   * Get current sessionId (for debugging or manual check)
   */
  getSessionId(): string {
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

    // Don't navigate away from main page - it has the sessionId we need
    console.log(`准备获取课程 ${course.id} 的作业（不离开主页面）...`)

    // Wait a bit to ensure sessionId is fully initialized
    await this.page?.waitForTimeout(2000)

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
