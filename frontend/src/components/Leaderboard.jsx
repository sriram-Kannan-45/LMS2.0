import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Trophy, Medal, Flame, Clock, TrendingUp, Crown, Star, Zap } from 'lucide-react'

const Leaderboard = ({ data = [], title = 'Quiz Leaderboard', showChart = true, currentUserId = null }) => {
  const [filterRange, setFilterRange] = useState('all')

  const topThree = data.slice(0, 3)
  const rest = data.slice(3)
  const podiumOrder = [1, 0, 2] // 2nd, 1st, 3rd

  const chartData = data.slice(0, 10).map(entry => ({
    name: entry.name?.length > 10 ? entry.name.substring(0, 10) + '...' : entry.name || 'Unknown',
    score: entry.score || 0
  }))

  const getBadgeForRank = (rank) => {
    if (rank === 1) return { icon: '🥇', label: '1st', color: 'from-yellow-400 to-amber-500' }
    if (rank === 2) return { icon: '🥈', label: '2nd', color: 'from-gray-300 to-gray-400' }
    if (rank === 3) return { icon: '🥉', label: '3rd', color: 'from-orange-300 to-orange-400' }
    if (rank <= 10) return { icon: '⭐', label: `Top ${rank}`, color: 'from-blue-400 to-indigo-500' }
    return null
  }

  const getMedalColor = (score) => {
    if (score >= 90) return 'text-yellow-500'
    if (score >= 80) return 'text-indigo-500'
    if (score >= 70) return 'text-emerald-500'
    return 'text-slate-400'
  }

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 }
  }

  const podiumHeights = { 0: 'h-36', 1: 'h-28', 2: 'h-20' } // 1st, 2nd, 3rd

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-200"
            >
              <Trophy size={24} className="text-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h2>
              <p className="text-sm text-slate-500 mt-0.5">See how you rank among participants</p>
            </div>
          </div>
          {data.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <TrendingUp size={16} className="text-indigo-500" />
              <span className="text-sm font-semibold text-indigo-600">{data.length} participants</span>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All Time', icon: <Star size={14} /> },
            { key: 'top10', label: 'Top 10', icon: <Crown size={14} /> },
            { key: 'today', label: 'Today', icon: <Clock size={14} /> }
          ].map(range => (
            <motion.button
              key={range.key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterRange(range.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                filterRange === range.key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {range.icon}
              {range.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {data.length === 0 ? (
        <motion.div
          variants={itemVariants}
          initial="initial"
          animate="animate"
          className="text-center py-20 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-200"
        >
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-5"
          >
            <Trophy size={36} className="text-slate-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>No Attempts Yet</h3>
          <p className="text-slate-500 max-w-xs mx-auto">Be the first to take this quiz and claim the top spot on the leaderboard!</p>
        </motion.div>
      ) : (
        <>
          {/* Podium for Top 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {podiumOrder.map((pos, i) => {
                const entry = topThree[pos]
                if (!entry) return <div key={i} className="h-32" />

                const isFirst = pos === 0
                const rank = pos + 1
                const isCurrentUser = currentUserId && entry.userId === currentUserId

                return (
                  <motion.div
                    key={entry.userId || entry.name || i}
                    initial={{ y: 60, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.15 + 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                    className={`relative ${isFirst ? 'sm:order-2 sm:scale-105' : i === 0 ? 'sm:order-1' : 'sm:order-3'}`}
                  >
                    {/* Current User Indicator */}
                    {isCurrentUser && (
                      <motion.div 
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute -top-3 right-0 left-0 flex justify-center z-10"
                      >
                        <div className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-200">
                          ✨ YOU
                        </div>
                      </motion.div>
                    )}

                    {/* Card */}
                    <div
                      className={`rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl ${
                        isCurrentUser
                          ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100'
                          : isFirst
                          ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg shadow-amber-100'
                          : 'border-slate-200 bg-white shadow-md hover:shadow-lg'
                      }`}
                    >
                      {/* Header Bar */}
                      <div
                        className={`h-1.5 bg-gradient-to-r ${
                          isFirst
                            ? 'from-yellow-400 to-amber-500'
                            : rank === 2
                            ? 'from-slate-300 to-slate-400'
                            : rank === 3
                            ? 'from-orange-300 to-orange-400'
                            : isCurrentUser
                            ? 'from-indigo-500 to-purple-600'
                            : 'from-slate-300 to-slate-400'
                        }`}
                      />

                      <div className="p-6 text-center">
                        {/* Medal */}
                        <motion.div 
                          animate={isFirst ? { y: [0, -5, 0] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-5xl mb-3"
                        >
                          {getBadgeForRank(rank)?.icon}
                        </motion.div>

                        {/* Avatar */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-lg ${
                            isFirst
                              ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-amber-200'
                              : rank === 2
                              ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                              : rank === 3
                              ? 'bg-gradient-to-br from-orange-400 to-orange-500'
                              : isCurrentUser
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                              : 'bg-gradient-to-br from-slate-400 to-slate-500'
                          }`}
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                          {(entry.name || 'U').charAt(0).toUpperCase()}
                        </motion.div>

                        {/* Name */}
                        <h3 className="font-bold text-slate-900 text-lg mb-1 truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {entry.name || 'Anonymous'}
                        </h3>

                        {/* Time if available */}
                        {entry.timeTaken && (
                          <p className="text-xs text-slate-500 mb-3 flex items-center justify-center gap-1">
                            <Clock size={12} />
                            {entry.timeTaken}
                          </p>
                        )}

                        {/* Score */}
                        <div className="flex items-baseline justify-center gap-1 mb-4">
                          <span
                            className={`text-4xl font-bold ${
                              isFirst ? 'text-amber-600' : rank === 2 ? 'text-slate-600' : 'text-orange-600'
                            }`}
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            {entry.score?.toFixed(1) || 0}
                          </span>
                          <span className="text-lg text-slate-400 font-medium">%</span>
                        </div>

                        {/* Bar Indicator */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${entry.score || 0}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                            className={`h-full rounded-full ${
                              isFirst
                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                                : rank === 2
                                ? 'bg-gradient-to-r from-slate-300 to-slate-400'
                                : 'bg-gradient-to-r from-orange-300 to-orange-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Chart */}
          {showChart && chartData.length > 0 && (
            <motion.div
              variants={itemVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.3 }}
              className="mb-10 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart size={20} className="text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Score Distribution</h3>
                <span className="text-xs text-slate-500 ml-auto bg-slate-100 px-2.5 py-1 rounded-lg font-medium">Top 10</span>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.5)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      color: '#1e293b',
                      padding: '12px 16px',
                    }}
                  />
                  <Bar dataKey="score" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Rest of Leaderboard - Table View */}
          {rest.length > 0 && (
            <motion.div
              variants={itemVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Participant</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rest.map((entry, index) => {
                      const rank = index + 4
                      const isCurrentUser = currentUserId && entry.userId === currentUserId
                      const score = entry.score || 0

                      return (
                        <motion.tr
                          key={entry.userId || entry.name || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.04 }}
                          className={`transition-colors hover:bg-indigo-50/30 ${
                            isCurrentUser ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>#{rank}</span>
                              {rank <= 10 && (
                                <Flame size={14} className={getMedalColor(score)} />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-semibold text-white text-sm shadow-sm">
                                {(entry.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{entry.name || 'Anonymous'}</p>
                                {isCurrentUser && (
                                  <p className="text-[10px] text-indigo-600 font-bold">✨ You</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{score.toFixed(1)}</span>
                              <span className="text-xs text-slate-400 font-medium">%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                score >= 80
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : score >= 60
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : score >= 40
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {score >= 80 ? '⭐ Excellent' : score >= 60 ? '👍 Good' : score >= 40 ? '📈 Passed' : '💪 Keep Trying'}
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}

export default Leaderboard
