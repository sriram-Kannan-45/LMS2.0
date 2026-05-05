import React from 'react'
import { motion } from 'framer-motion'

const SkeletonLoader = ({ 
  type = 'text',       // text, card, table, leaderboard
  count = 1,
  className = ''
}) => {
  const pulseVariants = {
    initial: { opacity: 0.6 },
    animate: {
      opacity: [0.6, 1, 0.6],
      transition: { duration: 1.5, repeat: Infinity }
    }
  }

  if (type === 'text') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            className="h-4 bg-slate-200 rounded"
          />
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="animate"
        className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}
      >
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded w-5/6" />
          </div>
        </div>
      </motion.div>
    )
  }

  if (type === 'leaderboard') {
    return (
      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="animate"
        className={`space-y-3 ${className}`}
      >
        {Array.from({ length: count || 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-3 bg-slate-200 rounded w-20" />
            </div>
            <div className="h-4 bg-slate-200 rounded w-16 flex-shrink-0" />
          </div>
        ))}
      </motion.div>
    )
  }

  if (type === 'quiz') {
    return (
      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="animate"
        className={`space-y-4 ${className}`}
      >
        {/* Header */}
        <div className="h-8 bg-slate-200 rounded w-3/4" />
        
        {/* Options */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded-lg" />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <div className="h-10 bg-slate-200 rounded-lg flex-1" />
          <div className="h-10 bg-slate-200 rounded-lg flex-1" />
        </div>
      </motion.div>
    )
  }

  // Default
  return null
}

export default SkeletonLoader
