import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Award, Clock, Zap } from 'lucide-react'

const QuizResultsSummary = ({ result, onViewLeaderboard }) => {
  if (!result) return null

  const score = result.score || 0
  const totalQuestions = result.totalQuestions || 0
  const timeTaken = result.timeTaken || 0
  const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : 0

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'from-green-400 to-emerald-500'
    if (pct >= 60) return 'from-blue-400 to-indigo-500'
    if (pct >= 40) return 'from-amber-400 to-orange-500'
    return 'from-red-400 to-rose-500'
  }

  const getScoreBadge = (pct) => {
    if (pct >= 90) return '🏆 Outstanding'
    if (pct >= 80) return '⭐ Excellent'
    if (pct >= 70) return '✨ Great'
    if (pct >= 60) return '👍 Good'
    if (pct >= 50) return '📈 Passed'
    return '💪 Keep Trying'
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const containerVariants = {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    }
  }

  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="w-full max-w-2xl mx-auto"
    >
      {/* Success Header */}
      <div className="relative mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl"
        />
        <div className="relative bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4 shadow-lg"
          >
            <CheckCircle size={32} className="text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">Quiz Complete!</h1>
          <p className="text-slate-600">Great job! Here's how you performed.</p>
        </div>
      </div>

      {/* Score Card */}
      <motion.div
        variants={itemVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
        className={`bg-gradient-to-br ${getScoreColor(percentage)} rounded-2xl p-8 sm:p-10 text-white mb-6 shadow-lg`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/80 text-sm font-medium mb-1">YOUR SCORE</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{percentage}</span>
              <span className="text-2xl font-semibold">%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl mb-2">{getScoreBadge(percentage).split(' ')[0]}</div>
            <p className="text-white/90 font-semibold text-sm">{getScoreBadge(percentage).split(' ').slice(1).join(' ')}</p>
          </div>
        </div>

        <div className="bg-white/20 rounded-lg p-3 mb-4">
          <p className="text-white/90 text-sm">
            You answered <strong>{score} out of {totalQuestions}</strong> questions correctly.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/20 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Questions Answered */}
        <motion.div
          variants={itemVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Zap size={20} className="text-blue-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium">Questions Answered</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{score}/{totalQuestions}</p>
        </motion.div>

        {/* Time Taken */}
        <motion.div
          variants={itemVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.25 }}
          className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock size={20} className="text-purple-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium">Time Taken</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{formatTime(timeTaken)}</p>
        </motion.div>
      </div>

      {/* CTA Buttons */}
      <motion.div
        variants={itemVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.3 }}
        className="flex gap-3 sm:gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onViewLeaderboard}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <Award size={18} />
            View Leaderboard
          </div>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="py-3 px-6 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all duration-200"
        >
          Review Answers
        </motion.button>
      </motion.div>

      {/* Encouragement Message */}
      <motion.div
        variants={itemVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.4 }}
        className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg text-center"
      >
        <p className="text-sm text-slate-700">
          {percentage >= 80
            ? '🎉 Outstanding performance! You clearly know your stuff!'
            : percentage >= 60
            ? '🌟 Nice work! Keep practicing to improve further.'
            : '💪 Good effort! Review the material and try again.'}
        </p>
      </motion.div>
    </motion.div>
  )
}

export default QuizResultsSummary
