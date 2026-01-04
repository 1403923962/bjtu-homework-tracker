// API 配置
// 通过环境变量 VITE_API_BASE_URL 设置，构建时传入
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// API 调用封装
export async function fetchHomeworkCache(studentId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/homework-cache`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId })
  })
  return response.json()
}

export async function fetchHomeworkFull(
  studentId: string,
  password: string,
  finishStatus: string = 'all'
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/homework-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      password: password,
      finish_status: finishStatus
    })
  })
  return response.json()
}
