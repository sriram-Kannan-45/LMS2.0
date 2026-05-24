import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Send, Clock, CheckCircle2, Zap, Loader, Target, Flame, Brain, TrendingUp } from 'lucide-react'
import { useToast } from './Toast'
import { API_BASE } from '../api/api'
import { getAuthHeaders } from '../api/request'

function QuizTaking({ quizId, attemptId, quizData, onSubmit }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState((quizData?.timeLimit || 30) * 60)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const timerRef = useRef(null)
  const { error: showError, success: showSuccess } = useToast()

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    const answerArray = Object.entries(answers).map(([questionId, val]) => ({
      questionId: parseInt(questionId),
      selectedOption: val.selectedOption !== undefined ? val.selectedOption : null,
      answerText: val.answerText || null
    }))

    try {
      const r = await fetch(`${API_BASE}/ai-quiz/participant/submit/${attemptId}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Submit failed')
      showSuccess('Quiz submitted successfully!')
      onSubmit(d.result)
    } catch (err) {
      console.error('Submit error:', err)
      showError('Failed to submit quiz: ' + err.message)
      setSubmitting(false)
    }
  }

  if (!quizData || !quizData.questions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl mb-6"
          >
            <Loader className="text-indigo-600" size={32} />
          </motion.div>
          <p className="text-slate-700 font-bold text-xl">Loading Quiz</p>
          <p className="text-slate-500 text-sm mt-2">Preparing your assessment...</p>
        </motion.div>
      </div>
    )
  }

  const q = quizData.questions[currentQ]
  const progress = ((currentQ + 1) / quizData.questions.length) * 100
  const answeredCount = Object.keys(answers).length
  const unansweredCount = quizData.questions.length - answeredCount
  const totalTime = (quizData?.timeLimit || 30) * 60
  const timeProgress = (timeLeft / totalTime) * 100
  const isAnswered = !!answers[q.id]

  const getTimeColor = () => {
    if (timeLeft < 300) return 'from-red-500 to-orange-500'
    if (timeLeft < 600) return 'from-amber-500 to-orange-500'
    return 'from-indigo-500 to-purple-500'
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.4 } }
  }

  const pageVariants = {
    initial: { opacity: 0, x: 100, scale: 0.95 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1, 
      transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } 
    },
    exit: { 
      opacity: 0, 
      x: -100, 
      scale: 0.95, 
      transition: { duration: 0.2 } 
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 pb-40"
    >
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 -left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        </div>

        <div className="relative z-10 backdrop-blur-xl bg-white/30 border border-white/40 px-6 sm:px-10 py-8 sm:py-12 shadow-2xl">
          <div className="max-w-7xl mx-auto">
            {/* Hero Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full border border-indigo-400/30 mb-4 text-sm font-semibold text-indigo-700"
                >
                  <Zap size={16} />
                  AI Generated Assessment
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-2"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {quizData.title}
                </motion.h1>
                <p className="text-slate-600 text-sm sm:text-base">Test your knowledge with this comprehensive assessment</p>
              </div>

              {/* Timer Badge */}
              <motion.div 
                animate={timeLeft < 300 ? { scale: [1, 1.05, 1] } : {}}
                transition={timeLeft < 300 ? { duration: 1, repeat: Infinity } : {}}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r ${getTimeColor()} text-white font-bold text-lg shadow-lg`}
              >
                <Clock size={24} />
                <span className="font-mono">{formatTime(timeLeft)}</span>
              </motion.div>
            </div>

            {/* Progress Stats Row */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-white/80 to-indigo-50/50 backdrop-blur rounded-2xl p-4 border border-white/60"
              >
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Progress</p>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{Math.round(progress)}%</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-gradient-to-br from-white/80 to-emerald-50/50 backdrop-blur rounded-2xl p-4 border border-white/60"
              >
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Answered</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{answeredCount}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-white/80 to-amber-50/50 backdrop-blur rounded-2xl p-4 border border-white/60"
              >
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Remaining</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{unansweredCount}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="hidden sm:block bg-gradient-to-br from-white/80 to-purple-50/50 backdrop-blur rounded-2xl p-4 border border-white/60"
              >
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Question</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{currentQ + 1}/{quizData.questions.length}</p>
              </motion.div>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Overall Progress</span>
                <span className="text-xs font-bold text-indigo-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden backdrop-blur">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/50"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Question & Options */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={q.id}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Question Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-white to-indigo-50/30 rounded-3xl p-8 sm:p-10 border border-white/60 shadow-2xl backdrop-blur-xl mb-8 relative overflow-hidden"
                >
                  {/* Floating background effect */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10" />
                  
                  <div className="flex items-start gap-6">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg"
                    >
                      {currentQ + 1}
                    </motion.div>
                    <div className="flex-1">
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-snug mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {q.questionText}
                      </h2>
                      {q.questionType === 'MCQ' && (
                        <p className="text-slate-600 font-medium flex items-center gap-2">
                          <Target size={16} className="text-indigo-600" />
                          Select the most accurate option
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Options */}
                <div className="space-y-4">
                  {q.questionType === 'MCQ' ? (
                    <>
                      {q.options?.map((opt, idx) => {
                        const isSelected = answers[q.id]?.selectedOption === idx
                        return (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + idx * 0.08 }}
                            whileHover={!isSelected ? { scale: 1.02, y: -4 } : {}}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAnswer(q.id, { selectedOption: idx })}
                            className={`w-full text-left p-6 sm:p-7 rounded-2xl border-2 transition-all duration-300 flex items-start gap-4 group relative overflow-hidden ${
                              isSelected
                                ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl shadow-indigo-500/30'
                                : 'border-white/60 bg-white hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-200/30 backdrop-blur-xl'
                            }`}
                          >
                            {/* Background glow */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 -z-10" />
                            )}

                            {/* Option Badge */}
                            <motion.div
                              animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ duration: 0.3 }}
                              className={`flex-shrink-0 w-12 h-12 rounded-xl font-bold flex items-center justify-center text-sm transition-all duration-300 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </motion.div>

                            {/* Option Text */}
                            <div className="flex-1 pt-0.5">
                              <p className={`font-semibold text-base sm:text-lg leading-relaxed transition-colors ${
                                isSelected ? 'text-indigo-900' : 'text-slate-700 group-hover:text-slate-900'
                              }`}>
                                {opt}
                              </p>
                            </div>

                            {/* Checkmark */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                  className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center"
                                >
                                  <CheckCircle2 size={16} className="text-white" strokeWidth={3} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        )
                      })}
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-6 sm:p-8 border border-white/60 backdrop-blur-xl shadow-lg"
                    >
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 block">Your Answer</label>
                      <textarea
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none font-medium text-slate-800 placeholder:text-slate-400 min-h-[200px]"
                        placeholder="Type your detailed answer here..."
                        value={answers[q.id]?.answerText || ''}
                        onChange={e => handleAnswer(q.id, { answerText: e.target.value })}
                      />
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{(answers[q.id]?.answerText || '').length} characters</span>
                        <span className="text-indigo-600 font-semibold">Write detailed answers for better scores</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column - Analytics & Progress */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Circular Progress */}
            <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-3xl p-8 border border-white/60 backdrop-blur-xl shadow-xl text-center">
              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="url(#grad1)"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - progress / 100) }}
                    transition={{ duration: 0.6 }}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold text-slate-900">{Math.round(progress)}<span className="text-xl">%</span></p>
                  <p className="text-xs text-slate-600 mt-1 font-semibold">Complete</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 font-medium">Question {currentQ + 1} of {quizData.questions.length}</p>
            </div>

            {/* Question Navigator */}
            <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-3xl p-6 border border-white/60 backdrop-blur-xl shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Question Navigator</h3>
              <div className="grid grid-cols-6 gap-2">
                {quizData.questions.map((question, idx) => (
                  <motion.button
                    key={question.id}
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentQ(idx)}
                    className={`w-full aspect-square rounded-lg font-bold text-xs transition-all ${
                      idx === currentQ
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
                        : answers[question.id]
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                    title={`Question ${idx + 1}${answers[question.id] ? ' ✓' : ''}`}
                  >
                    {idx + 1}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-3xl p-6 border border-white/60 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Flame size={20} className="text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Performance</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Answered</span>
                  <span className="text-lg font-bold text-emerald-600">{answeredCount}/{quizData.questions.length}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(answeredCount / quizData.questions.length) * 100}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Brain Card - AI Insight */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-3xl p-6 border border-indigo-200/40 backdrop-blur-xl shadow-xl cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <Brain size={20} className="text-indigo-600" />
                <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">AI Insight</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                You're making {Math.round((answeredCount / (currentQ + 1)) * 100)}% progress! Keep focused on the remaining questions.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Sticky Bottom Navigation */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/90 border-t border-white/40 shadow-2xl z-40"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
            {/* Previous Button */}
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-slate-300 hover:shadow-md disabled:opacity-40 transition-all w-full sm:w-auto"
            >
              <ChevronLeft size={20} />
              <span className="hidden sm:inline">Previous</span>
            </motion.button>

            {/* Center Info */}
            <div className="flex-1 flex items-center justify-center gap-4 text-sm font-semibold text-slate-700">
              <span className="text-indigo-600">{answeredCount} Answered</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-600">{unansweredCount} Remaining</span>
            </div>

            {/* Next/Submit Button */}
            {currentQ < quizData.questions.length - 1 ? (
              <motion.button
                whileHover={{ scale: 1.05, x: 2, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentQ(Math.min(quizData.questions.length - 1, currentQ + 1))}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all w-full sm:w-auto"
              >
                <span className="hidden sm:inline">Next Question</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight size={20} />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(34, 197, 94, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConfirmSubmit(true)}
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-60 transition-all w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    <span className="hidden sm:inline">Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span className="hidden sm:inline">Submit Quiz</span>
                    <span className="sm:hidden">Submit</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
            onClick={() => setShowConfirmSubmit(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/60 backdrop-blur-xl"
            >
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
              
              <div className="p-8 sm:p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-emerald-100 rounded-2xl">
                    <CheckCircle2 className="text-emerald-600" size={28} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Submit Quiz?</h2>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-200/60 space-y-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Questions Answered:</span>
                    <span className="font-bold text-indigo-600">{answeredCount}/{quizData.questions.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Time Remaining:</span>
                    <span className="font-bold text-emerald-600">{formatTime(timeLeft)}</span>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mb-6"
                  >
                    <p className="text-sm text-amber-900 font-semibold">⚠️ You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}</p>
                    <p className="text-xs text-amber-700 mt-1">Your score will reflect this.</p>
                  </motion.div>
                )}

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowConfirmSubmit(false)}
                    className="flex-1 px-4 py-3.5 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Continue
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowConfirmSubmit(false)
                      handleSubmit()
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    Submit
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default QuizTaking

/* CSS Animation */
const style = document.createElement('style')
style.textContent = `
  @keyframes blob {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(20px, -50px) scale(1.1); }
    50% { transform: translate(-20px, 20px) scale(0.9); }
    75% { transform: translate(50px, 50px) scale(1.05); }
  }
  
  @keyframes animation-delay-2000 {
    0% { animation-delay: -2s; }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: -2s;
  }
`
document.head.appendChild(style)
