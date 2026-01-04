import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Sparkles, Moon, Sun, Clock, CheckCircle,
  XCircle, Calendar, Users, BookOpen, Minimize2, X,
  RefreshCw, Home, List, Settings as SettingsIcon,
  ChevronDown, ChevronUp, EyeOff, Eye, Trash2
} from 'lucide-react'
import { fetchHomeworkCache, fetchHomeworkFull } from './api'

// 检测是否在 Tauri 桌面环境
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__

// 动态导入 Tauri API（仅桌面端使用）
const getTauriApis = async () => {
  if (!isTauri) return null
  const [{ appWindow }, { invoke }, { open }] = await Promise.all([
    import('@tauri-apps/api/window'),
    import('@tauri-apps/api/tauri'),
    import('@tauri-apps/api/shell')
  ])
  return { appWindow, invoke, open }
}

type View = 'home' | 'detail' | 'ignored' | 'settings'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [currentView, setCurrentView] = useState<View>('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; age_minutes?: number; timestamp?: number } | null>(null)
  const [ignoredHomeworks, setIgnoredHomeworks] = useState<any[]>([])
  const [loadingIgnored, setLoadingIgnored] = useState(false)

  // 首次启动检测 - 从localStorage加载保存的学号
  useEffect(() => {
    const savedStudentId = localStorage.getItem('studentId')
    const savedPassword = localStorage.getItem('password')

    if (savedStudentId) {
      setStudentId(savedStudentId)
      if (savedPassword) {
        setPassword(savedPassword)
      }

      // 自动尝试使用缓存登录
      autoLoginWithCache(savedStudentId)
    }
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 自动使用缓存登录
  const autoLoginWithCache = async (sid: string) => {
    try {
      console.log('🔵 Auto login with cache for:', sid)
      let cacheData: any

      if (isTauri) {
        const tauri = await getTauriApis()
        const cacheResult = await tauri!.invoke('fetch_homework_cache', { studentId: sid }) as string
        cacheData = JSON.parse(cacheResult)
      } else {
        cacheData = await fetchHomeworkCache(sid)
      }

      if (cacheData.success && cacheData.data.length > 0) {
        setHomeworks(cacheData.data)
        setIsLoggedIn(true)
        setCacheInfo({
          cached: true,
          age_minutes: cacheData.age_minutes,
          timestamp: cacheData.timestamp
        })
        console.log('✅ Auto login successful with cache')
      }
    } catch (error) {
      console.log('🟡 No cache available for auto login')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔵 Login button clicked, student_id:', studentId)

    // 验证学号格式：必须是8位数字
    if (!/^\d{8}$/.test(studentId)) {
      return
    }

    setLoading(true)

    try {
      // 保存学号和密码到localStorage
      localStorage.setItem('studentId', studentId)
      if (password) {
        localStorage.setItem('password', password)
      }

      // 1. 先尝试加载缓存 (快速，<100ms)
      try {
        console.log('🔵 Calling fetch_homework_cache...')
        let cacheData: any

        if (isTauri) {
          const tauri = await getTauriApis()
          const cacheResult = await tauri!.invoke('fetch_homework_cache', { studentId }) as string
          cacheData = JSON.parse(cacheResult)
        } else {
          cacheData = await fetchHomeworkCache(studentId)
        }
        console.log('🔵 Cache result:', cacheData)

        if (cacheData.success && cacheData.data.length > 0) {
          setHomeworks(cacheData.data)
          setIsLoggedIn(true)
          setCacheInfo({
            cached: true,
            age_minutes: cacheData.age_minutes,
            timestamp: cacheData.timestamp
          })
          setLoading(false)

          // 2. 后台刷新完整数据
          setRefreshing(true)
          setTimeout(async () => {
            try {
              let fullData: any
              if (isTauri) {
                const tauri = await getTauriApis()
                const fullResult = await tauri!.invoke('fetch_homework_full', {
                  studentId,
                  password: password || `Bjtu@${studentId}`,
                  finishStatus: 'all'
                }) as string
                fullData = JSON.parse(fullResult)
              } else {
                fullData = await fetchHomeworkFull(studentId, password || `Bjtu@${studentId}`, 'all')
              }

              if (fullData.success) {
                setHomeworks(fullData.data)
                setCacheInfo({ cached: false })
              }
            } catch (error) {
              console.error('后台刷新失败:', error)
            } finally {
              setRefreshing(false)
            }
          }, 500)

          return
        }
      } catch (error) {
        console.log('🟡 无缓存，执行完整登录', error)
      }

      // 3. 如果没有缓存，执行完整登录 (~60秒)
      console.log('🔵 Calling fetch_homework_full...')
      let fullData: any
      if (isTauri) {
        const tauri = await getTauriApis()
        const fullResult = await tauri!.invoke('fetch_homework_full', {
          studentId,
          password: password || `Bjtu@${studentId}`,
          finishStatus: 'all'
        }) as string
        fullData = JSON.parse(fullResult)
      } else {
        fullData = await fetchHomeworkFull(studentId, password || `Bjtu@${studentId}`, 'all')
      }
      console.log('🔵 Full data received:', fullData)

      if (fullData.success) {
        console.log('✅ Login successful, data count:', fullData.data.length)
        setHomeworks(fullData.data)
        setIsLoggedIn(true)
        setCacheInfo({ cached: false })
      } else {
        console.log('❌ Login failed:', fullData.error)
        alert('登录失败：' + (fullData.error || '未知错误'))
      }
    } catch (error: any) {
      alert('请求失败，请确保后端服务已启动\n错误信息：' + error.toString())
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    // 验证学号格式
    if (!/^\d{8}$/.test(studentId)) {
      return
    }

    setRefreshing(true)
    try {
      let fullData: any
      if (isTauri) {
        const tauri = await getTauriApis()
        const fullResult = await tauri!.invoke('fetch_homework_full', {
          studentId,
          password: password || `Bjtu@${studentId}`,
          finishStatus: 'all'
        }) as string
        fullData = JSON.parse(fullResult)
      } else {
        fullData = await fetchHomeworkFull(studentId, password || `Bjtu@${studentId}`, 'all')
      }

      if (fullData.success) {
        setHomeworks(fullData.data)
        setCacheInfo({ cached: false })
      } else {
        alert('刷新失败：' + (fullData.error || '未知错误'))
      }
    } catch (error: any) {
      alert('刷新失败：' + error.toString())
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = () => {
    // 不删除localStorage，下次自动用缓存登录
    setIsLoggedIn(false)
    setHomeworks([])
    setCacheInfo(null)
    setIgnoredHomeworks([])
  }

  // 从 localStorage 加载已忽略的作业ID列表
  useEffect(() => {
    if (studentId && isLoggedIn) {
      const key = `ignored_homeworks_${studentId}`
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          const ignored = JSON.parse(saved)
          setIgnoredHomeworks(ignored || [])
        } catch (error) {
          console.error('加载已忽略作业失败:', error)
        }
      }
    }
  }, [studentId, isLoggedIn])

  // 忽略作业
  const handleIgnoreHomework = (hw: any) => {
    const ignoredItem = {
      homework_id: hw.id,
      course_name: hw.course_name,
      title: hw.title,
      ignored_at: Date.now()
    }

    const newIgnored = [...ignoredHomeworks, ignoredItem]
    setIgnoredHomeworks(newIgnored)

    // 保存到 localStorage
    const key = `ignored_homeworks_${studentId}`
    localStorage.setItem(key, JSON.stringify(newIgnored))
  }

  // 取消忽略作业
  const handleUnignoreHomework = (homeworkId: string) => {
    const newIgnored = ignoredHomeworks.filter(item => item.homework_id !== homeworkId)
    setIgnoredHomeworks(newIgnored)

    // 保存到 localStorage
    const key = `ignored_homeworks_${studentId}`
    localStorage.setItem(key, JSON.stringify(newIgnored))
  }

  // 检查作业是否被忽略
  const isHomeworkIgnored = (homeworkId: string) => {
    return ignoredHomeworks.some(item => item.homework_id === homeworkId)
  }

  // 过滤掉已忽略的作业
  const filteredHomeworks = homeworks.filter(hw => !isHomeworkIgnored(hw.id))

  const getTimeInfo = (dueTime: string | null) => {
    if (!dueTime) return {
      text: '无截止时间',
      fullTime: '无截止时间',
      color: 'text-gray-500',
      urgent: false
    }

    const due = new Date(dueTime)
    const now = new Date()
    const diff = due.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    // 完整时间戳（精确到分钟）
    const fullTime = due.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    if (diff < 0) {
      return {
        text: '已过期',
        fullTime,
        color: 'text-red-500 dark:text-red-400',
        urgent: false
      }
    } else if (days === 0 && hours < 24) {
      return {
        text: `${hours}小时后`,
        fullTime,
        color: 'text-red-500 dark:text-red-400',
        urgent: true
      }
    } else if (days < 3) {
      return {
        text: `${days}天后`,
        fullTime,
        color: 'text-orange-500 dark:text-orange-400',
        urgent: true
      }
    } else {
      return {
        text: `${days}天后`,
        fullTime,
        color: 'text-green-500 dark:text-green-400',
        urgent: false
      }
    }
  }

  // 按课程分组作业（使用过滤后的作业列表）
  const groupedHomeworks = filteredHomeworks.reduce((acc, hw) => {
    if (!acc[hw.course_name]) {
      acc[hw.course_name] = []
    }
    acc[hw.course_name].push(hw)
    return acc
  }, {} as Record<string, any[]>)

  // 未交作业（使用过滤后的作业列表）
  const unfinishedHomeworks = filteredHomeworks.filter(hw => hw.submit_status !== '已提交')

  // Window controls (仅桌面端)
  const minimizeWindow = async () => {
    if (isTauri) {
      const tauri = await getTauriApis()
      tauri?.appWindow.minimize()
    }
  }

  const closeWindow = async () => {
    if (isTauri) {
      const tauri = await getTauriApis()
      tauri?.appWindow.close()
    }
  }

  // 打开外部链接
  const openExternal = async (url: string) => {
    if (isTauri) {
      const tauri = await getTauriApis()
      tauri?.open(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const toggleCourse = (courseName: string) => {
    const newExpanded = new Set(expandedCourses)
    if (newExpanded.has(courseName)) {
      newExpanded.delete(courseName)
    } else {
      newExpanded.add(courseName)
    }
    setExpandedCourses(newExpanded)
  }

  // 登录页面
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen relative overflow-hidden ${darkMode && 'dark'} bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-violet-900`}>
        {/* Custom title bar - 仅桌面端显示 */}
        {isTauri && (
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
        )}

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
        <div className={`relative z-10 min-h-screen flex items-center justify-center p-4 ${isTauri ? 'pt-12' : ''}`}>
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

              <button
                type="button"
                onClick={() => openExternal('https://bksycenter.bjtu.edu.cn/UserInfoSettings/PasswordRetake.aspx?type=3')}
                className="w-full mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                忘记密码？
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    )
  }

  // 主页 - 作业概览
  const renderHomeView = () => {
    const displayHomeworks = showCompleted ? filteredHomeworks : unfinishedHomeworks

    return (
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                我的作业
              </h1>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="glass px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {showCompleted ? '仅显示未交' : '显示全部'}
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              {showCompleted ? `${filteredHomeworks.length} 项作业` : `${unfinishedHomeworks.length} 项待完成`}
              {ignoredHomeworks.length > 0 && (
                <span className="text-sm text-gray-500">
                  (已隐藏 {ignoredHomeworks.length} 项)
                </span>
              )}
              {refreshing && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  刷新中...
                </span>
              )}
              {cacheInfo?.cached && !refreshing && (
                <span className="text-sm text-gray-500">
                  (缓存数据，{cacheInfo.age_minutes}分钟前)
                </span>
              )}
            </p>
          </div>

          {/* 作业列表 */}
          <div className="space-y-3">
            <AnimatePresence>
              {displayHomeworks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 glass rounded-2xl"
                >
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    🎉 太棒了！暂无待完成作业
                  </p>
                </motion.div>
              ) : (
                displayHomeworks.map((hw, index) => {
                  const timeInfo = getTimeInfo(hw.due_time)
                  const isCompleted = hw.submit_status === '已提交'

                  return (
                    <motion.div
                      key={hw.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                      className={`glass rounded-xl p-4 cursor-pointer ${timeInfo.urgent && !isCompleted ? 'ring-2 ring-red-500/50' : ''} ${isCompleted ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="mt-1">
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-400 dark:border-gray-500" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold mb-1 ${isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>
                            {hw.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <BookOpen className="w-4 h-4 text-purple-500" />
                            <span>{hw.course_name}</span>
                            {hw.submit_count != null && hw.total_count != null && (
                              <>
                                <span className="text-gray-400 dark:text-gray-500">•</span>
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-medium">
                                  {hw.submit_count}/{hw.total_count} 已交
                                </span>
                              </>
                            )}
                          </div>
                          {hw.due_time && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className={`w-4 h-4 ${timeInfo.color}`} />
                                <span className={`text-sm font-medium ${timeInfo.color}`}>
                                  {timeInfo.fullTime}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-6">
                                <span className={`text-xs ${timeInfo.color}`}>
                                  {timeInfo.text}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Ignore button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleIgnoreHomework(hw)
                          }}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="隐藏此作业"
                        >
                          <EyeOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>

                        {/* Urgent indicator */}
                        {timeInfo.urgent && !isCompleted && (
                          <div className="text-red-500">
                            <XCircle className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // 详情页 - 按课程分组
  const renderDetailView = () => (
    <div className="flex-1 overflow-y-auto p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            所有课程
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {Object.keys(groupedHomeworks).length} 门课程 · {homeworks.length} 项作业
          </p>
        </div>

        {/* 课程列表 */}
        <div className="space-y-3">
          {Object.entries(groupedHomeworks).map(([courseName, courseHomeworks]) => {
            const isExpanded = expandedCourses.has(courseName)
            const unfinishedCount = courseHomeworks.filter(hw => hw.submit_status !== '已提交').length

            return (
              <motion.div
                key={courseName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-xl overflow-hidden"
              >
                {/* Course header */}
                <button
                  onClick={() => toggleCourse(courseName)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {courseName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {courseHomeworks.length} 项作业
                        {unfinishedCount > 0 && (
                          <span className="text-orange-500 ml-2">· {unfinishedCount} 项未交</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {/* Course homeworks */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200/50 dark:border-gray-700/50"
                    >
                      <div className="p-4 space-y-2">
                        {courseHomeworks.map((hw) => {
                          const timeInfo = getTimeInfo(hw.due_time)
                          return (
                            <div
                              key={hw.id}
                              className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  {hw.submit_status === '已提交' ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-400 dark:border-gray-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                                    {hw.title}
                                  </h4>
                                  {hw.submit_count != null && hw.total_count != null && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                                      <Users className="w-3.5 h-3.5 text-blue-500" />
                                      <span className="font-medium">
                                        {hw.submit_count}/{hw.total_count} 已交
                                      </span>
                                    </div>
                                  )}
                                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                    {hw.content}
                                  </p>
                                  {hw.due_time && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Calendar className={`w-4 h-4 ${timeInfo.color}`} />
                                        <span className={timeInfo.color}>
                                          {timeInfo.fullTime}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 ml-5 text-xs">
                                        <span className={timeInfo.color}>
                                          {timeInfo.text}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // 已忽略作业页
  const renderIgnoredView = () => (
    <div className="flex-1 overflow-y-auto p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            已隐藏作业
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {ignoredHomeworks.length} 项已隐藏的作业
          </p>
        </div>

        {/* 已忽略列表 */}
        <div className="space-y-3">
          <AnimatePresence>
            {ignoredHomeworks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 glass rounded-2xl"
              >
                <EyeOff className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  暂无隐藏的作业
                </p>
              </motion.div>
            ) : (
              ignoredHomeworks.map((item, index) => (
                <motion.div
                  key={item.homework_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <BookOpen className="w-4 h-4 text-purple-500" />
                        <span>{item.course_name}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        隐藏于 {new Date(item.ignored_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleUnignoreHomework(item.homework_id)
                      }}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="恢复显示"
                    >
                      <Eye className="w-5 h-5 text-green-500" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )

  // 设置页
  const renderSettingsView = () => (
    <div className="flex-1 overflow-y-auto p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            设置
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            账号管理与应用设置
          </p>
        </div>

        {/* 设置卡片 */}
        <div className="space-y-4">
          {/* 账号信息 */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">账号信息</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">学号</p>
                <p className="text-gray-600 dark:text-gray-400">{studentId}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                重新登录
              </button>
            </div>
          </div>

          {/* 数据管理 */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">数据管理</h3>
            <div className="space-y-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-5 h-5 text-purple-500 ${refreshing ? 'animate-spin' : ''}`} />
                  <div className="text-left">
                    <p className="font-medium text-gray-800 dark:text-white">手动刷新</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">重新获取最新作业数据</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 外观设置 */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">外观</h3>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5 text-purple-500" /> : <Sun className="w-5 h-5 text-purple-500" />}
                <div className="text-left">
                  <p className="font-medium text-gray-800 dark:text-white">深色模式</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{darkMode ? '已开启' : '已关闭'}</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${darkMode && 'dark'} bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900 dark:to-violet-900 flex flex-col`}>
      {/* Custom title bar - 仅桌面端显示 */}
      {isTauri && (
        <div data-tauri-drag-region className="h-8 bg-purple-600 dark:bg-purple-900 flex items-center justify-between px-2">
          <div className="text-xs font-medium text-white ml-2">BJTU作业追踪器</div>
          <div className="flex gap-2">
            <button onClick={minimizeWindow} className="w-6 h-6 flex items-center justify-center hover:bg-purple-700 rounded text-white">
              <Minimize2 className="w-3 h-3" />
            </button>
            <button onClick={closeWindow} className="w-6 h-6 flex items-center justify-center hover:bg-red-500 rounded text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {currentView === 'home' && renderHomeView()}
      {currentView === 'detail' && renderDetailView()}
      {currentView === 'ignored' && renderIgnoredView()}
      {currentView === 'settings' && renderSettingsView()}

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-around p-2 max-w-4xl mx-auto">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              currentView === 'home'
                ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">首页</span>
          </button>

          <button
            onClick={() => setCurrentView('detail')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              currentView === 'detail'
                ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <List className="w-6 h-6" />
            <span className="text-xs font-medium">详情</span>
          </button>

          <button
            onClick={() => setCurrentView('ignored')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative ${
              currentView === 'ignored'
                ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <EyeOff className="w-6 h-6" />
            <span className="text-xs font-medium">已隐藏</span>
            {ignoredHomeworks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {ignoredHomeworks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              currentView === 'settings'
                ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <SettingsIcon className="w-6 h-6" />
            <span className="text-xs font-medium">设置</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
