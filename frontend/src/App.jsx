import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, CheckCircle, XCircle, Moon, Sun, LogOut, Calendar, Users } from 'lucide-react'
import axios from 'axios'
import './App.css'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [homeworks, setHomeworks] = useState([])
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [filter, setFilter] = useState('unfinished')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const fetchHomework = async () => {
    setLoading(true)
    try {
      const response = await axios.post('http://localhost:8000/api/homework', {
        student_id: studentId,
        password: password,
        use_hash: false
      }, {
        params: {
          finish_status: filter
        }
      })
      setHomeworks(response.data.data)
      setIsLoggedIn(true)
    } catch (error) {
      alert('登录失败：' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    fetchHomework()
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setHomeworks([])
    setStudentId('')
    setPassword('')
  }

  const getTimeRemaining = (dueTime) => {
    if (!dueTime) return { text: '无截止时间', color: 'text-gray-500', urgent: false }

    const due = new Date(dueTime)
    const now = new Date()
    const diff = due - now
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diff < 0) {
      return { text: '已过期', color: 'text-red-500 dark:text-red-400', urgent: false }
    } else if (days === 0 && hours < 24) {
      return { text: `${hours}小时后`, color: 'text-red-500 dark:text-red-400 animate-pulse', urgent: true }
    } else if (days < 3) {
      return { text: `${days}天后`, color: 'text-orange-500 dark:text-orange-400', urgent: true }
    } else {
      return { text: `${days}天后`, color: 'text-green-500 dark:text-green-400', urgent: false }
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="fixed top-6 right-6 glass-card p-3 z-10"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <BookOpen className="w-16 h-16 text-blue-500" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              BJTU作业追踪器 2.0
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">现代化 · 高效 · 炫酷</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                学号
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass border-2 border-transparent focus:border-blue-500 outline-none transition-all"
                placeholder="请输入学号"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass border-2 border-transparent focus:border-blue-500 outline-none transition-all"
                placeholder="留空使用默认密码"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                筛选条件
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass border-2 border-transparent focus:border-blue-500 outline-none transition-all"
              >
                <option value="all">全部作业</option>
                <option value="unfinished">未完成</option>
                <option value="finished">已完成</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '加载中...' : '登录查询'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              作业列表
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              共 {homeworks.length} 项作业
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="glass-card p-3"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="glass-card p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Homework Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {homeworks.map((hw, index) => {
              const timeInfo = getTimeRemaining(hw.due_time)
              return (
                <motion.div
                  key={hw.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card p-6 ${timeInfo.urgent ? 'ring-2 ring-red-500' : ''}`}
                >
                  {/* Course Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {hw.course_name}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 line-clamp-2">
                    {hw.title}
                  </h3>

                  {/* Content */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {hw.content}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-2 text-sm">
                    {/* Due Time */}
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${timeInfo.color}`} />
                      <span className={timeInfo.color}>
                        {timeInfo.text}
                      </span>
                      {hw.due_time && (
                        <span className="text-gray-500 text-xs ml-auto">
                          {hw.due_time}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {hw.submit_status === '已提交' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={hw.submit_status === '已提交' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                        {hw.submit_status}
                      </span>
                    </div>

                    {/* Submission Count */}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {hw.submit_count}/{hw.total_count} 已提交
                      </span>
                    </div>

                    {/* Create Date */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span className="text-gray-500 text-xs">
                        {hw.create_date}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {homeworks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              暂无作业
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default App
