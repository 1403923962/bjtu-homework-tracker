/**
 * Automated login module using Playwright + Tesseract.js
 */
import { chromium, type Page } from 'playwright'
import Tesseract from 'tesseract.js'
import fs from 'fs/promises'

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
      // Use Python ddddocr for better accuracy
      console.log('调用ddddocr识别验证码...')

      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execPromise = promisify(exec)

      // Call Python OCR service
      const { stdout, stderr } = await execPromise(`python ocr_service.py ${imagePath}`)

      if (stderr && stderr.trim()) {
        console.error('Python OCR错误:', stderr.trim())
      }

      const result = stdout.trim()
      console.log(`ddddocr识别结果: "${result}"`)

      if (!result || result.length === 0) {
        console.warn('⚠️  ddddocr无法识别验证码！')
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
        waitUntil: 'networkidle'
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
        timeout: 30000
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
      headless: true
    })

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Navigate directly to student login page (might redirect to CAS)
      console.log('直接访问学生登录页面...')
      await page.goto('https://bksy.bjtu.edu.cn/login_introduce_s.html', {
        waitUntil: 'networkidle'
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

      // After successful login on bksy, navigate to internal API to establish session
      console.log('登录成功，正在导航到内部API系统...')
      await page.goto('http://123.121.147.7:88/ve/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex', {
        waitUntil: 'networkidle',
        timeout: 30000
      })
      await page.waitForTimeout(2000)

      console.log(`内部API session已建立，当前URL: ${page.url()}`)

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
