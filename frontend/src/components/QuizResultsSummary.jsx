import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, Award, Clock, Target, 
  RotateCcw, Trophy, ChevronRight, Sparkles,
  TrendingUp, BarChart2, Star
} from 'lucide-react'

const QuizResultsSummary = ({ result, onViewLeaderboard, onBack }) => {
  if (!result) return null

  const score = result.score || 0
  const totalQuestions = result.totalQuestions || 0
  const timeTaken = result.timeTaken || 0
  const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : 0
  const pctNum = parseFloat(percentage)

  const getScoreColor = (pct) => {
    if (pct >= 90) return 'from-indigo-600 via-purple-600 to-pink-600'
    if (pct >= 80) return 'from-emerald-500 to-teal-600'
    if (pct >= 60) return 'from-blue-500 to-indigo-600'
    if (pct >= 40) return 'from-amber-500 to-orange-600'
    return 'from-rose-500 to-red-600'
  }

  const getScoreTheme = (pct) => {
    if (pct >= 90) return { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', rawColor: '#9333ea' }
    if (pct >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', rawColor: '#10b981' }
    if (pct >= 60) return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', rawColor: '#2563eb' }
    if (pct >= 40) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', rawColor: '#d97706' }
    return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', rawColor: '#e11d48' }
  }

  const getScoreBadge = (pct) => {
    if (pct >= 90) return { label: '🏆 Elite Masterpiece', sub: 'Absolute perfection! Master status achieved.' }
    if (pct >= 80) return { label: '⭐ Outstanding Job', sub: 'Excellent understanding of the concepts.' }
    if (pct >= 70) return { label: '✨ Great Effort', sub: 'Superb attempt! Just a few steps from mastery.' }
    if (pct >= 60) return { label: '👍 Good Progress', sub: 'Solid work! Keep testing yourself.' }
    if (pct >= 50) return { label: '📈 Passed', sub: 'You passed! Keep practicing to get better.' }
    return { label: '💪 Keep Pushing', sub: 'Review the topics and try again, you can do it!' }
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const badgeInfo = getScoreBadge(pctNum)
  const theme = getScoreTheme(pctNum)

  // SVG ring configuration
  const radius = 60
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pctNum / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Decorative backdrop blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-200/20 to-purple-200/20 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Main card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100/40 overflow-hidden relative mb-8">
        
        {/* Colorful top bar */}
        <div className={`h-2 bg-gradient-to-r ${getScoreColor(pctNum)}`} />

        <div className="p-6 sm:p-10 relative">
          {/* Confetti orbs */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-50/50 rounded-full blur-3xl pointer-events-none" />

          {/* Top Header Badge */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.1 }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold ${theme.bg} ${theme.border} ${theme.text}`}
            >
              <Sparkles size={14} className="animate-pulse" />
              <span>ASSESSMENT RESOLVED</span>
            </motion.div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Quiz Completed!
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-500 font-medium max-w-md mx-auto text-sm sm:text-base"
            >
              Excellent effort! Here is a detailed breakdown of your performance metrics.
            </motion.p>
          </div>

          {/* Circular Score Visual & Status */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-10 pb-8 border-b border-slate-100">
            {/* SVG Progress Circle */}
            <div className="relative flex items-center justify-center">
              <svg className="w-40 h-40 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="text-slate-100"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: strokeDashoffset }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  strokeLinecap="round"
                  className={`bg-gradient-to-r`}
                  stroke={theme.rawColor}
                  fill="transparent"
                />
              </svg>
              {/* Inner score texts */}
              <div className="absolute flex flex-col items-center justify-center">
                <motion.span 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="text-4xl font-black text-slate-900 leading-none"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {pctNum.toFixed(0)}%
                </motion.span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Score</span>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="text-center md:text-left max-w-sm flex-1">
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                {badgeInfo.label}
              </h3>
              <p className="text-sm text-slate-500 font-medium mb-4">
                {badgeInfo.sub}
              </p>

              {/* Mini Horizontal bar */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Target size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Correct Answers</p>
                  <p className="text-lg font-black text-slate-850">
                    {score} <span className="text-xs text-slate-400 font-medium">/ {totalQuestions} Questions</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center gap-1"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-1 border border-amber-100">
                <Trophy size={16} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placement</span>
              <span className="text-xl font-black text-slate-800">
                {result.rank ? `#${result.rank}` : 'Top Rank'}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center gap-1"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-1 border border-purple-100">
                <Clock size={16} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Taken</span>
              <span className="text-xl font-black text-slate-800">{formatTime(timeTaken)}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center gap-1"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1 border border-emerald-100">
                <Star size={16} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Success Rate</span>
              <span className="text-xl font-black text-slate-800">{percentage}%</span>
            </motion.div>
          </div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
          >
            {onBack && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onBack}
                className="flex-1 sm:flex-initial py-3.5 px-6 border-2 border-slate-200 text-slate-600 hover:text-slate-800 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-350 transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <RotateCcw size={16} />
                Back to Dashboard
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewLeaderboard}
              className="flex-1 sm:flex-initial py-3.5 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-150 transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Award size={16} />
              View Leaderboard
              <ChevronRight size={14} />
            </motion.button>
          </motion.div>

        </div>
      </div>

      {/* Mini tip footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-xs text-slate-400 font-semibold"
      >
        🌟 Powered by Antigravity Redesigned Quiz System
      </motion.div>
    </motion.div>
  )
}

export default QuizResultsSummary
