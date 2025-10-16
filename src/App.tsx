import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Sparkles, Moon, Sun, Clock, CheckCircle, XCircle, Calendar, Users, BookOpen, Minimize2, X } from 'lucide-react'
import { appWindow } from '@tauri-apps/api/window'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [homeworks, setHomeworks] = useState<any[]>([])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('http://localhost:3001/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          password: password,
          use_hash: false,
          finish_status: 'unfinished'
        })
      })

      const data = await response.json()
      if (data.success) {
        setHomeworks(data.data)
        setIsLoggedIn(true)
      } else {
        alert('登录失败：' + data.error)
      }
    } catch (error: any) {
      alert('请求失败，请确保后端服务已启动：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTimeInfo = (dueTime: string | null) => {
    if (!dueTime) return { text: '无截止时间', color: 'text-gray-500', urgent: false }

    const due = new Date(dueTime)
    const now = new Date()
    const diff = due.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diff < 0) {
      return { text: '已过期', color: 'text-red-500 dark:text-red-400', urgent: false }
    } else if (days === 0 && hours < 24) {
      return { text: `${hours}小时后`, color: 'text-red-500 dark:text-red-400', urgent: true }
    } else if (days < 3) {
      return { text: `${days}天后`, color: 'text-orange-500 dark:text-orange-400', urgent: true }
    } else {
      return { text: `${days}天后`, color: 'text-green-500 dark:text-green-400', urgent: false }
    }
  }

  // Window controls
  const minimizeWindow = () => {
    appWindow.minimize()
  }

  const closeWindow = () => {
    appWindow.close()
  }

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen relative overflow-hidden ${darkMode && 'dark'} bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-violet-900`}>
        {/* Custom title bar */}
        <div data-tauri-drag-region className="h-8 bg-transparent flex items-center justify-between px-2 fixed top-0 left-0 right-0 z-50">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 ml-2">BJTU作业追踪器</div>
          <div className="flex gap-2">
            <button onClick={minimizeWindow} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <Minimize2 className="w-3 h-3" />
            </button>
            <button onClick={closeWindow} className="w-6 h-6 flex items-center justify-center hover:bg-red-500 hover:text-white rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-purple-500/30 rounded-full blur-3xl -top-48 -left-48 animate-float" />
          <div className="absolute w-96 h-96 bg-blue-500/30 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute w-96 h-96 bg-pink-500/30 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '4s' }} />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="fixed top-12 right-6 z-50 glass rounded-full p-3 hover:scale-110 transition-transform"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Login form */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl"
          >
            {/* Logo */}
            <motion.div
              className="flex justify-center mb-8"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className="relative">
                <GraduationCap className="w-20 h-20 text-purple-600 dark:text-purple-400" />
                <Sparkles className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
              </div>
            </motion.div>

            {/* Title */}
            <div className="text-center mb-8">
              <motion.h1
                className="text-4xl md:text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 animate-shimmer"
                style={{ backgroundSize: '200% auto' }}
              >
                BJTU 作业追踪器
              </motion.h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                桌面版 · Tauri · 极致轻量
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-500 dark:text-gray-400">仅 3MB · 原生性能</span>
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  学号
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass border-2 border-transparent focus:border-purple-500 outline-none transition-all dark:text-white"
                  placeholder="请输入学号"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass border-2 border-transparent focus:border-purple-500 outline-none transition-all dark:text-white"
                  placeholder="留空使用默认密码"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? '登录中...' : '开始追踪作业'}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode && 'dark'} bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-violet-900`}>
      {/* Custom title bar */}
      <div data-tauri-drag-region className="h-8 bg-purple-600 dark:bg-purple-900 flex items-center justify-between px-2">
        <div className="text-xs font-medium text-white ml-2">BJTU作业追踪器 - {homeworks.length} 项作业</div>
        <div className="flex gap-2">
          <button onClick={minimizeWindow} className="w-6 h-6 flex items-center justify-center hover:bg-purple-700 rounded text-white">
            <Minimize2 className="w-3 h-3" />
          </button>
          <button onClick={closeWindow} className="w-6 h-6 flex items-center justify-center hover:bg-red-500 rounded text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="p-4">
        <div className="glass rounded-2xl p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              作业列表
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              共 {homeworks.length} 项作业
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="glass rounded-full p-2 hover:scale-110 transition-transform"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="glass rounded-full px-4 py-2 hover:scale-105 transition-transform text-red-500 font-medium text-sm"
            >
              退出
            </button>
          </div>
        </div>

        {/* Homework grid */}
        <div className="grid grid-cols-2 gap-4 mt-4 max-h-[calc(100vh-160px)] overflow-y-auto pr-2">
          <AnimatePresence>
            {homeworks.map((hw, index) => {
              const timeInfo = getTimeInfo(hw.due_time)
              return (
                <motion.div
                  key={hw.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className={`glass rounded-xl p-4 group relative overflow-hidden ${timeInfo.urgent ? 'ring-2 ring-red-500/50' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    {/* Course badge */}
                    <div className="flex items-center gap-1 mb-2">
                      <BookOpen className="w-3 h-3 text-purple-500" />
                      <span className="text-xs font-medium bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 truncate">
                        {hw.course_name}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {hw.title}
                    </h3>

                    {/* Content */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {hw.content}
                    </p>

                    {/* Metadata */}
                    <div className="space-y-1.5 text-xs">
                      {/* Due time */}
                      {hw.due_time && (
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3 h-3 ${timeInfo.color} ${timeInfo.urgent ? 'animate-pulse' : ''}`} />
                          <span className={`font-medium ${timeInfo.color}`}>
                            {timeInfo.text}
                          </span>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center gap-1.5">
                        {hw.submit_status === '已提交' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-gray-400" />
                        )}
                        <span className={hw.submit_status === '已提交' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                          {hw.submit_status}
                        </span>
                      </div>

                      {/* Submission count */}
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-purple-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {hw.submit_count}/{hw.total_count}
                        </span>
                        <div className="flex-1">
                          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                              style={{ width: `${(hw.submit_count / hw.total_count) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
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
            className="text-center py-12"
          >
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              🎉 暂无作业，享受自由时光！
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default App
