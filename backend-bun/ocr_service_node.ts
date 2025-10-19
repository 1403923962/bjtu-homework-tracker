/**
 * Node.js版ddddocr OCR服务
 * 用于替代Python版本，去除Python依赖
 */

import fs from 'fs'
import path from 'path'

// 使用全局require或动态创建（兼容打包后的环境）
let ddddOcrModule: any
if (typeof require !== 'undefined') {
  // 如果全局require已存在（打包后）
  ddddOcrModule = require('ddddocr-node')
} else {
  // 开发环境，动态import
  const { createRequire } = await import('module')
  const req = createRequire(import.meta.url)
  ddddOcrModule = req('ddddocr-node')
}
const { DdddOcr } = ddddOcrModule

export class NodeOcrService {
  private ddddOcr: any

  constructor() {
    this.ddddOcr = new DdddOcr()
  }

  /**
   * 识别验证码图片
   * @param imagePath 验证码图片路径
   * @returns 识别结果字符串
   */
  async recognizeCaptcha(imagePath: string): Promise<string> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(imagePath)) {
        throw new Error(`图片文件不存在: ${imagePath}`)
      }

      console.log(`🔍 调用ddddocr-node识别验证码...`)
      console.log(`📁 图片路径: ${imagePath}`)

      // 使用ddddocr-node识别
      const result = await this.ddddOcr.classification(imagePath)

      console.log(`✅ ddddocr-node识别结果: "${result}"`)

      return result.trim()
    } catch (error) {
      console.error(`❌ OCR识别失败:`, error)
      throw error
    }
  }

  /**
   * 使用Buffer识别验证码
   * @param imageBuffer 图片Buffer
   * @returns 识别结果字符串
   */
  async recognizeCaptchaFromBuffer(imageBuffer: Buffer): Promise<string> {
    try {
      // 临时保存图片
      const tempPath = path.join(process.cwd(), `temp_captcha_${Date.now()}.png`)
      fs.writeFileSync(tempPath, imageBuffer)

      // 识别
      const result = await this.recognizeCaptcha(tempPath)

      // 删除临时文件
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }

      return result
    } catch (error) {
      console.error(`❌ OCR识别失败(Buffer):`, error)
      throw error
    }
  }
}

// 导出单例
export const nodeOcrService = new NodeOcrService()
