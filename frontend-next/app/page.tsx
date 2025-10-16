'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Sparkles, Moon, Sun } from 'lucide-react'
import HomeworkCard from '@/components/HomeworkCard'
import { cn } from '@/lib/utils'

export default function Home() {
  const [darkMode, setDarkMode] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [homeworks, setHomeworks] = useState<any[]>([])

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
      alert('请求失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className={cn("min-h-screen relative overflow-hidden", darkMode && "dark")}>
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-purple-500/30 rounded-full blur-3xl -top-48 -left-48 animate-float" />
          <div className="absolute w-96 h-96 bg-blue-500/30 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute w-96 h-96 bg-pink-500/30 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: '4s' }} />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="fixed top-6 right-6 z-50 glass rounded-full p-3 hover:scale-110 transition-transform"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Login form */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
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
                style={{
                  backgroundSize: '200% auto',
                }}
              >
                BJTU 作业追踪器
              </motion.h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                NextGen · 超现代化 · 极致体验
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Powered by Bun + Next.js 14</span>
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
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? '登录中...' : '开始追踪作业'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen p-4 md:p-8", darkMode && "dark")}>
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl top-0 right-0 animate-float" />
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl bottom-0 left-0 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="glass rounded-2xl p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              作业列表
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              共 {homeworks.length} 项作业
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="glass rounded-full p-3 hover:scale-110 transition-transform"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="glass rounded-full px-6 py-3 hover:scale-105 transition-transform text-red-500 font-medium"
            >
              退出
            </button>
          </div>
        </div>

        {/* Homework grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {homeworks.map((hw, index) => (
              <HomeworkCard key={hw.id} homework={hw} index={index} />
            ))}
          </AnimatePresence>
        </div>

        {homeworks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-gray-500 dark:text-gray-400 text-xl">
              🎉 暂无作业，享受自由时光！
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
