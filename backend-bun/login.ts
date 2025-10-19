/**
 * Automated login module using Playwright + Tesseract.js
 */
import { chromium, type Page } from 'playwright'
import Tesseract from 'tesseract.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class AutoLogin {
  private cookie: Record<string, string> = {}
  private browser: any = null
  private context: any = null
  private page: any = null

  /**
   * OCR captcha using Tesseract.js
   */
  private async ocrCaptcha(imagePath: string): Promise<string> {
    try {
      // Use Node.js ddddocr-node (no Python dependency)
      console.log('调用ddddocr-node识别验证码...')

      // 使用Node.js版本的OCR服务（去除Python依赖）
      const { nodeOcrService } = await import('./ocr_service_node')
      const result = await nodeOcrService.recognizeCaptcha(imagePath)

      if (!result || result.length === 0) {
        console.warn('⚠️  ddddocr-node无法识别验证码！')
        return ''
      }

      return result
    } catch (error: any) {
      console.error('OCR识别失败:', error.message)

      // Fallback to Tesseract.js if Python fails
      console.log('尝试使用Tesseract.js备用识别...')
      try {
        const { data } = await Tesseract.recognize(
          imagePath,
          'eng',
          {
            logger: () => {},
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
          }
        )
        const fallbackResult = data.text.trim().replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '')
        console.log(`Tesseract.js备用结果: "${fallbackResult}"`)
        return fallbackResult
      } catch (e) {
        console.error('备用OCR也失败')
        return ''
      }
    }
  }

  /**
   * Safely evaluate math expression
   */
  private evaluateMath(expr: string): number {
    // Only allow numbers and basic operators
    if (!/^[\d\+\-\*\/\(\)\s\.]+$/.test(expr)) {
      throw new Error('Invalid expression')
    }

    // Use Function constructor (safer than eval)
    const func = new Function('return ' + expr)
    return func()
  }

  /**
   * Login using Playwright automation
   */
  async login(studentId: string, password: string): Promise<Record<string, string>> {
    const browser = await chromium.launch({
      headless: true
    })

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Navigate directly to student login page (might redirect to CAS)
      console.log('直接访问学生登录页面...')
      await page.goto('https://bksy.bjtu.edu.cn/login_introduce_s.html', {
        waitUntil: 'networkidle',
        timeout: 120000  // 2 minutes timeout
      })
      await page.waitForTimeout(2000)

      // Check current URL after potential redirect
      const currentUrl = page.url()
      console.log(`当前URL: ${currentUrl}`)

      // Take screenshot to debug
      await page.screenshot({ path: 'debug_page.png' })
      console.log('已截图保存到 debug_page.png')

      // Check if redirected to CAS login
      if (currentUrl.includes('cas.bjtu.edu.cn')) {
        console.log('检测到CAS登录页面，使用CAS登录流程')

        // Fill CAS login form
        await page.fill('#id_loginname', studentId)
        await page.fill('#id_password', password)

        // Screenshot captcha
        console.log('截图验证码...')
        const captchaElement = page.locator('img.captcha')
        await captchaElement.screenshot({ path: 'captcha_temp.png' })
        // Save a copy for testing
        await captchaElement.screenshot({ path: 'captcha_for_test.png' })

        // OCR recognition
        console.log('OCR识别验证码...')
        const captchaAnswer = await this.ocrCaptcha('captcha_temp.png')
        console.log(`验证码答案: ${captchaAnswer}`)

        // Fill captcha
        await page.fill('#id_captcha_1', captchaAnswer)

        // Submit login
        console.log('提交CAS登录...')
        await page.click('button[type="submit"]')
        await page.waitForTimeout(3000)

        // Wait for redirect back to bksy
        await page.waitForURL('**/bksy.bjtu.edu.cn/**', { timeout: 10000 })
        console.log('登录成功，已跳转回学生页面')
      } else {
        // Fill login form on bksy page
        console.log(`在bksy页面填写学号: ${studentId}`)
        // Try placeholder-based selector
        await page.getByPlaceholder('学号').fill(studentId)

        // Fill password
        console.log('填写密码')
        await page.getByPlaceholder('密码').fill(password)

        // Screenshot captcha - it's the last image on the page (index 6)
        console.log('截图验证码...')
        // Wait a moment for image to load
        await page.waitForTimeout(1000)

        // Get all images and use the last one (the captcha)
        const allImages = await page.locator('img').all()
        console.log(`找到 ${allImages.length} 个图片元素`)

        if (allImages.length === 0) {
          throw new Error('未找到任何图片元素')
        }

        // Use the last image (the captcha)
        const captchaElement = allImages[allImages.length - 1]
        await captchaElement.screenshot({ path: 'captcha_temp.png' })
        console.log('验证码截图已保存')

        // OCR recognition
        console.log('OCR识别验证码...')
        const captchaAnswer = await this.ocrCaptcha('captcha_temp.png')
        console.log(`验证码答案: ${captchaAnswer}`)

        // Fill captcha
        console.log('填写验证码')
        await page.getByPlaceholder('验证码').fill(captchaAnswer)

        // Submit login
        console.log('提交登录...')
        await page.getByRole('button', { name: /登录|登 录/ }).click()
        await page.waitForTimeout(3000)
      }

      // After successful login on bksy, navigate to internal API to get cookies for that domain
      console.log('登录成功，正在导航到内部API系统获取cookies...')
      await page.goto('http://123.121.147.7:88/ve/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex', {
        waitUntil: 'networkidle',
        timeout: 120000  // 2 minutes timeout
      })
      await page.waitForTimeout(2000)

      console.log(`内部API当前URL: ${page.url()}`)

      // Get cookies from both domains
      const allCookies = await context.cookies()
      console.log(`获取到 ${allCookies.length} 个cookies (所有域名)`)
      console.log('所有cookies:', allCookies.map(c => `${c.name} (${c.domain})`))

      // Extract session cookies for the internal API domain
      const internalCookies = allCookies.filter(c =>
        c.domain.includes('123.121.147.7') ||
        c.domain.includes('.bjtu.edu.cn')
      )

      console.log(`内部API cookies (${internalCookies.length}个):`, internalCookies.map(c => c.name))

      // Build cookie object
      this.cookie = {}
      for (const cookie of internalCookies) {
        this.cookie[cookie.name] = cookie.value
        console.log(`成功获取 ${cookie.name}: ${cookie.value.substring(0, 20)}...`)
      }

      if (Object.keys(this.cookie).length === 0) {
        throw new Error('未找到有效的Session cookie')
      }

      // Cleanup
      await fs.unlink('captcha_temp.png').catch(() => {})

      return this.cookie

    } catch (error: any) {
      console.error('登录失败:', error.message)
      throw error
    } finally {
      await browser.close()
    }
  }

  getCookie(): Record<string, string> {
    return this.cookie
  }

  /**
   * Login and return the browser context for making authenticated API calls
   */
  async loginWithContext(studentId: string, password: string): Promise<{ browser: any; context: any; page: any }> {
    const browser = await chromium.launch({
      headless: true,  // 使用无头模式进行测试
      args: [
        '--disable-blink-features=AutomationControlled',  // 禁用自动化控制特征
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    })

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai'
    })

    // 注入反检测脚本
    await context.addInitScript(() => {
      // 移除webdriver标记
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      })

      // 修改plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      })

      // 修改languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en']
      })
    })

    const page = await context.newPage()

    try {
      // Navigate directly to student login page (might redirect to CAS)
      console.log('直接访问学生登录页面...')
      await page.goto('https://bksy.bjtu.edu.cn/login_introduce_s.html', {
        waitUntil: 'networkidle',
        timeout: 120000  // 2 minutes timeout
      })
      await page.waitForTimeout(2000)

      // Check current URL after potential redirect
      const currentUrl = page.url()
      console.log(`当前URL: ${currentUrl}`)

      // Take screenshot to debug
      await page.screenshot({ path: 'debug_page.png' })
      console.log('已截图保存到 debug_page.png')

      // Check if redirected to CAS login
      if (currentUrl.includes('cas.bjtu.edu.cn')) {
        console.log('检测到CAS登录页面，使用CAS登录流程')

        // Fill CAS login form
        await page.fill('#id_loginname', studentId)
        await page.fill('#id_password', password)

        // Screenshot captcha
        console.log('截图验证码...')
        const captchaElement = page.locator('img.captcha')
        await captchaElement.screenshot({ path: 'captcha_temp.png' })
        // Save a copy for testing
        await captchaElement.screenshot({ path: 'captcha_for_test.png' })

        // OCR recognition
        console.log('OCR识别验证码...')
        const captchaAnswer = await this.ocrCaptcha('captcha_temp.png')
        console.log(`验证码答案: ${captchaAnswer}`)

        // Fill captcha
        await page.fill('#id_captcha_1', captchaAnswer)

        // Submit login
        console.log('提交CAS登录...')
        await page.click('button[type="submit"]')
        await page.waitForTimeout(3000)

        // Wait for redirect back to bksy
        await page.waitForURL('**/bksy.bjtu.edu.cn/**', { timeout: 10000 })
        console.log('登录成功，已跳转回学生页面')
      } else {
        // Fill login form on bksy page
        console.log(`在bksy页面填写学号: ${studentId}`)
        // Try placeholder-based selector
        await page.getByPlaceholder('学号').fill(studentId)

        // Fill password
        console.log('填写密码')
        await page.getByPlaceholder('密码').fill(password)

        // Screenshot captcha - it's the last image on the page (index 6)
        console.log('截图验证码...')
        // Wait a moment for image to load
        await page.waitForTimeout(1000)

        // Get all images and use the last one (the captcha)
        const allImages = await page.locator('img').all()
        console.log(`找到 ${allImages.length} 个图片元素`)

        if (allImages.length === 0) {
          throw new Error('未找到任何图片元素')
        }

        // Use the last image (the captcha)
        const captchaElement = allImages[allImages.length - 1]
        await captchaElement.screenshot({ path: 'captcha_temp.png' })
        console.log('验证码截图已保存')

        // OCR recognition
        console.log('OCR识别验证码...')
        const captchaAnswer = await this.ocrCaptcha('captcha_temp.png')
        console.log(`验证码答案: ${captchaAnswer}`)

        // Fill captcha
        console.log('填写验证码')
        await page.getByPlaceholder('验证码').fill(captchaAnswer)

        // Submit login
        console.log('提交登录...')
        await page.getByRole('button', { name: /登录|登 录/ }).click()
        await page.waitForTimeout(3000)
      }

      // After successful login on bksy, directly navigate to course platform via NoMasterJumpPage
      console.log('登录成功，直接访问智慧课程平台跳转页面...')

      try {
        // 直接访问智慧课程平台的跳转URL
        console.log('访问跳转页面: NoMasterJumpPage.aspx')
        await page.goto('https://bksycenter.bjtu.edu.cn/NoMasterJumpPage.aspx?URL=jwcZhjx&FPC=page:jwcZhjx', {
          waitUntil: 'domcontentloaded',
          timeout: 120000  // 2 minutes timeout
        })

        // 等待跳转完成
        await page.waitForTimeout(3000)

        const currentUrl = page.url()
        console.log(`✅ 当前URL: ${currentUrl}`)

        // 检查URL中是否包含sessionId
        const sessionIdMatch = currentUrl.match(/sessionId=([A-F0-9]{32})/i)
        if (sessionIdMatch) {
          console.log(`🎉 成功！URL中包含sessionId: ${sessionIdMatch[1]}`)
        } else {
          console.warn('⚠️ URL中没有sessionId参数，但session可能仍然有效')
        }

        console.log(`✅ 智慧课程平台session已建立`)

      } catch (e: any) {
        console.error('⚠️ 访问课程平台时出错:', e.message)
        throw e
      }

      // Cleanup
      await fs.unlink('captcha_temp.png').catch(() => {})

      // Return browser context for API calls
      return { browser, context, page }

    } catch (error: any) {
      console.error('登录失败:', error.message)
      await browser.close()
      throw error
    }
  }
}
