/**
 * Cache Manager - 作业数据缓存管理
 *
 * 功能：
 * 1. 按student_id缓存作业数据到文件
 * 2. 读取缓存数据（如果存在）
 * 3. 检查缓存是否过期
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface CacheData {
  student_id: string
  timestamp: number
  data: any
  summary: any
  semester: string
}

export class CacheManager {
  private cacheDir: string

  constructor(cacheDir = './cache') {
    this.cacheDir = cacheDir

    // 确保缓存目录存在
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  /**
   * 生成缓存文件名（基于student_id的哈希）
   */
  private getCacheFilePath(studentId: string): string {
    const hash = crypto.createHash('md5').update(studentId).digest('hex')
    return path.join(this.cacheDir, `homework_${hash}.json`)
  }

  /**
   * 保存缓存数据
   */
  async save(studentId: string, data: any, summary: any, semester: string): Promise<void> {
    const cacheData: CacheData = {
      student_id: studentId,
      timestamp: Date.now(),
      data,
      summary,
      semester
    }

    const filePath = this.getCacheFilePath(studentId)

    try {
      fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2), 'utf-8')
      console.log(`💾 缓存已保存: ${filePath}`)
    } catch (error: any) {
      console.error(`❌ 缓存保存失败: ${error.message}`)
    }
  }

  /**
   * 读取缓存数据
   */
  async get(studentId: string): Promise<CacheData | null> {
    const filePath = this.getCacheFilePath(studentId)

    if (!fs.existsSync(filePath)) {
      console.log(`📭 无缓存数据: ${studentId}`)
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const cacheData: CacheData = JSON.parse(content)

      console.log(`📦 找到缓存数据: ${studentId} (${this.getAgeString(cacheData.timestamp)})`)

      return cacheData
    } catch (error: any) {
      console.error(`❌ 缓存读取失败: ${error.message}`)
      return null
    }
  }

  /**
   * 检查缓存是否存在
   */
  has(studentId: string): boolean {
    const filePath = this.getCacheFilePath(studentId)
    return fs.existsSync(filePath)
  }

  /**
   * 删除缓存
   */
  async delete(studentId: string): Promise<void> {
    const filePath = this.getCacheFilePath(studentId)

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`🗑️  缓存已删除: ${studentId}`)
      } catch (error: any) {
        console.error(`❌ 缓存删除失败: ${error.message}`)
      }
    }
  }

  /**
   * 获取缓存年龄（毫秒）
   */
  getAge(studentId: string): number | null {
    const filePath = this.getCacheFilePath(studentId)

    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const cacheData: CacheData = JSON.parse(content)
      return Date.now() - cacheData.timestamp
    } catch {
      return null
    }
  }

  /**
   * 检查缓存是否过期（默认24小时）
   */
  isExpired(studentId: string, maxAgeMs = 24 * 60 * 60 * 1000): boolean {
    const age = this.getAge(studentId)
    if (age === null) return true
    return age > maxAgeMs
  }

  /**
   * 获取缓存年龄字符串
   */
  private getAgeString(timestamp: number): string {
    const ageMs = Date.now() - timestamp
    const ageMinutes = Math.floor(ageMs / (1000 * 60))
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60))
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))

    if (ageDays > 0) {
      return `${ageDays}天前`
    } else if (ageHours > 0) {
      return `${ageHours}小时前`
    } else {
      return `${ageMinutes}分钟前`
    }
  }

  /**
   * 获取所有缓存列表
   */
  async listAll(): Promise<Array<{ studentId: string; timestamp: number; age: string }>> {
    const files = fs.readdirSync(this.cacheDir)
    const caches: Array<{ studentId: string; timestamp: number; age: string }> = []

    for (const file of files) {
      if (file.startsWith('homework_') && file.endsWith('.json')) {
        try {
          const filePath = path.join(this.cacheDir, file)
          const content = fs.readFileSync(filePath, 'utf-8')
          const cacheData: CacheData = JSON.parse(content)

          caches.push({
            studentId: cacheData.student_id,
            timestamp: cacheData.timestamp,
            age: this.getAgeString(cacheData.timestamp)
          })
        } catch {
          // Skip invalid cache files
        }
      }
    }

    return caches
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    const files = fs.readdirSync(this.cacheDir)

    for (const file of files) {
      if (file.startsWith('homework_') && file.endsWith('.json')) {
        try {
          fs.unlinkSync(path.join(this.cacheDir, file))
        } catch (error: any) {
          console.error(`❌ 删除失败: ${file} - ${error.message}`)
        }
      }
    }

    console.log(`🗑️  所有缓存已清空`)
  }
}
