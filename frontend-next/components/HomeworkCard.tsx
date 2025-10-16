'use client'

import { motion } from 'framer-motion'
import { Clock, CheckCircle, XCircle, Calendar, Users, BookOpen } from 'lucide-react'

interface HomeworkCardProps {
  homework: any
  index: number
}

export default function HomeworkCard({ homework, index }: HomeworkCardProps) {
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

  const timeInfo = getTimeInfo(homework.due_time)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`glass rounded-2xl p-6 group relative overflow-hidden ${
        timeInfo.urgent ? 'ring-2 ring-red-500/50 ring-offset-2 ring-offset-transparent' : ''
      }`}
    >
      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        {/* Course badge */}
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            {homework.course_name}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {homework.title}
        </h3>

        {/* Content */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          {homework.content}
        </p>

        {/* Metadata */}
        <div className="space-y-2.5 text-sm">
          {/* Due time */}
          {homework.due_time && (
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${timeInfo.urgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <Clock className={`w-4 h-4 ${timeInfo.color} ${timeInfo.urgent ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex-1">
                <span className={`font-medium ${timeInfo.color}`}>
                  {timeInfo.text}
                </span>
                <span className="text-gray-500 text-xs ml-2">
                  {homework.due_time}
                </span>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              homework.submit_status === '已提交'
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {homework.submit_status === '已提交' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <span className={
              homework.submit_status === '已提交'
                ? 'text-green-600 dark:text-green-400 font-medium'
                : 'text-gray-600 dark:text-gray-400'
            }>
              {homework.submit_status}
            </span>
          </div>

          {/* Submission count */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-gray-600 dark:text-gray-400">
              {homework.submit_count}/{homework.total_count} 已提交
            </span>
            <div className="ml-auto">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${(homework.submit_count / homework.total_count) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Create date */}
          {homework.create_date && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-500 text-xs">
                发布于 {homework.create_date}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
      </div>
    </motion.div>
  )
}
