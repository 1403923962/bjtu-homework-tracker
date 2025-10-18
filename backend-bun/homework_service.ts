/**
 * BJTU Homework Service - Clean API for Desktop App
 */
import { BJTUClientPlaywright } from './bjtu_client_playwright'

export interface Homework {
  id: string
  title: string
  course_name: string
  course_id: string
  end_time: string
  content: string
  subStatus: string
  type: 'homework' | 'report' | 'experiment'
  submitCount?: number
  score?: string
  daysLeft?: number
  isOverdue?: boolean
  isUrgent?: boolean
}

export interface Course {
  id: string
  name: string
  teacher_name?: string
  course_num?: string
}

export interface HomeworkSummary {
  total: number
  unsubmitted: number
  submitted: number
  overdue: number
  urgent: number // 3天内截止
  homeworks: Homework[]
}

export class HomeworkService {
  private client: BJTUClientPlaywright | null = null

  /**
   * Login and initialize service
   */
  async login(studentId: string, password: string): Promise<void> {
    this.client = new BJTUClientPlaywright()
    await this.client.login(studentId, password)
  }

  /**
   * Get all homeworks from all courses
   */
  async getAllHomeworks(): Promise<HomeworkSummary> {
    if (!this.client) {
      throw new Error('Not logged in. Call login() first.')
    }

    // Get current semester
    const semester = await this.client.getCurrentSemester()

    // Get all courses
    const courses = await this.client.getCourses(semester)

    // Get homeworks from all courses
    const allHomeworks: any[] = []

    for (const course of courses) {
      try {
        const homeworks = await this.client.getHomeworkForCourse(course, semester)
        allHomeworks.push(...homeworks)
      } catch (e) {
        console.error(`Failed to get homeworks for course ${course.name}:`, e)
      }
    }

    // Process and categorize homeworks
    const processedHomeworks = allHomeworks.map(hw => {
      const deadline = new Date(hw.end_time)
      const now = new Date()
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isOverdue = daysLeft < 0
      const isUrgent = daysLeft >= 0 && daysLeft <= 3

      // Determine type
      let type: 'homework' | 'report' | 'experiment' = 'homework'
      if (hw.content_type === 1) type = 'report'
      else if (hw.content_type === 2) type = 'experiment'

      return {
        id: hw.id.toString(),
        title: hw.title,
        course_name: hw.course_name,
        course_id: hw.course_id.toString(),
        end_time: hw.end_time,
        content: hw.content || '',
        subStatus: hw.subStatus || (hw.submitCount > 0 ? '已提交' : '未提交'),
        type,
        submitCount: hw.submitCount,
        score: hw.score,
        daysLeft,
        isOverdue,
        isUrgent
      } as Homework
    })

    // Sort by deadline
    processedHomeworks.sort((a, b) => {
      const timeA = new Date(a.end_time).getTime()
      const timeB = new Date(b.end_time).getTime()
      return timeA - timeB
    })

    // Calculate statistics
    const unsubmitted = processedHomeworks.filter(hw =>
      hw.subStatus === '未提交' || hw.submitCount === 0 || !hw.subStatus
    )
    const submitted = processedHomeworks.filter(hw =>
      hw.subStatus === '已提交' || (hw.submitCount && hw.submitCount > 0)
    )
    const overdue = processedHomeworks.filter(hw => hw.isOverdue && hw.subStatus === '未提交')
    const urgent = processedHomeworks.filter(hw => hw.isUrgent && hw.subStatus === '未提交')

    return {
      total: processedHomeworks.length,
      unsubmitted: unsubmitted.length,
      submitted: submitted.length,
      overdue: overdue.length,
      urgent: urgent.length,
      homeworks: processedHomeworks
    }
  }

  /**
   * Get list of all courses
   */
  async getCourses(): Promise<Course[]> {
    if (!this.client) {
      throw new Error('Not logged in. Call login() first.')
    }

    const semester = await this.client.getCurrentSemester()
    const courses = await this.client.getCourses(semester)

    return courses.map(c => ({
      id: c.id.toString(),
      name: c.name || c.courseName,
      teacher_name: c.teacher_name,
      course_num: c.course_num
    }))
  }

  /**
   * Get homeworks for a specific course
   */
  async getHomeworksForCourse(courseId: string): Promise<Homework[]> {
    if (!this.client) {
      throw new Error('Not logged in. Call login() first.')
    }

    const semester = await this.client.getCurrentSemester()
    const courses = await this.client.getCourses(semester)

    const course = courses.find(c => c.id.toString() === courseId)
    if (!course) {
      throw new Error(`Course ${courseId} not found`)
    }

    const homeworks = await this.client.getHomeworkForCourse(course, semester)

    return homeworks.map(hw => {
      const deadline = new Date(hw.end_time)
      const now = new Date()
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      let type: 'homework' | 'report' | 'experiment' = 'homework'
      if (hw.content_type === 1) type = 'report'
      else if (hw.content_type === 2) type = 'experiment'

      return {
        id: hw.id.toString(),
        title: hw.title,
        course_name: hw.course_name,
        course_id: hw.course_id.toString(),
        end_time: hw.end_time,
        content: hw.content || '',
        subStatus: hw.subStatus || (hw.submitCount > 0 ? '已提交' : '未提交'),
        type,
        submitCount: hw.submitCount,
        score: hw.score,
        daysLeft,
        isOverdue: daysLeft < 0,
        isUrgent: daysLeft >= 0 && daysLeft <= 3
      }
    })
  }

  /**
   * Close the service and cleanup resources
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
    }
  }
}
