/**
 * Ignored Homework Manager
 * 管理每个学生的忽略作业列表
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface IgnoredHomework {
  homework_id: string
  course_name: string
  title: string
  ignored_at: number
}

export class IgnoredHomeworkManager {
  private ignoredDir: string

  constructor(ignoredDir = './cache/ignored') {
    this.ignoredDir = ignoredDir

    // 确保目录存在
    if (!fs.existsSync(this.ignoredDir)) {
      fs.mkdirSync(this.ignoredDir, { recursive: true })
    }
  }

  /**
   * 生成忽略列表文件路径
   */
  private getIgnoredFilePath(studentId: string): string {
    const hash = crypto.createHash('md5').update(studentId).digest('hex')
    return path.join(this.ignoredDir, `ignored_${hash}.json`)
  }

  /**
   * 获取学生的忽略列表
   */
  async getIgnoredList(studentId: string): Promise<IgnoredHomework[]> {
    const filePath = this.getIgnoredFilePath(studentId)

    if (!fs.existsSync(filePath)) {
      return []
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      return data.ignored || []
    } catch (error: any) {
      console.error(`读取忽略列表失败: ${error.message}`)
      return []
    }
  }

  /**
   * 添加忽略的作业
   */
  async addIgnored(studentId: string, homeworkId: string, courseName: string, title: string): Promise<void> {
    const ignoredList = await this.getIgnoredList(studentId)

    // 检查是否已存在
    const exists = ignoredList.some(item => item.homework_id === homeworkId)
    if (exists) {
      console.log(`作业 ${homeworkId} 已经在忽略列表中`)
      return
    }

    // 添加新忽略项
    const newItem: IgnoredHomework = {
      homework_id: homeworkId,
      course_name: courseName,
      title: title,
      ignored_at: Date.now()
    }

    ignoredList.push(newItem)

    // 保存
    await this.saveIgnoredList(studentId, ignoredList)
    console.log(`✅ 已忽略作业: ${title} (${homeworkId})`)
  }

  /**
   * 取消忽略的作业
   */
  async removeIgnored(studentId: string, homeworkId: string): Promise<void> {
    const ignoredList = await this.getIgnoredList(studentId)

    // 过滤掉要取消的作业
    const filtered = ignoredList.filter(item => item.homework_id !== homeworkId)

    if (filtered.length === ignoredList.length) {
      console.log(`作业 ${homeworkId} 不在忽略列表中`)
      return
    }

    // 保存
    await this.saveIgnoredList(studentId, filtered)
    console.log(`✅ 已取消忽略作业: ${homeworkId}`)
  }

  /**
   * 检查作业是否被忽略
   */
  async isIgnored(studentId: string, homeworkId: string): Promise<boolean> {
    const ignoredList = await this.getIgnoredList(studentId)
    return ignoredList.some(item => item.homework_id === homeworkId)
  }

  /**
   * 保存忽略列表到文件
   */
  private async saveIgnoredList(studentId: string, ignoredList: IgnoredHomework[]): Promise<void> {
    const filePath = this.getIgnoredFilePath(studentId)

    try {
      const data = {
        student_id: studentId,
        updated_at: Date.now(),
        ignored: ignoredList
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error: any) {
      console.error(`保存忽略列表失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 清空学生的所有忽略记录
   */
  async clearAll(studentId: string): Promise<void> {
    await this.saveIgnoredList(studentId, [])
    console.log(`🗑️  已清空学生 ${studentId} 的忽略列表`)
  }
}
