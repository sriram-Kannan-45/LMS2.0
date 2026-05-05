import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Send, Clock, AlertCircle, CheckCircle, Timer, Zap, Loader } from 'lucide-react'
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
  const { error: showError } = useToast()

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
      onSubmit(d.result)
    } catch (err) {
      console.error('Submit error:', err)
      showError('Failed to submit quiz: ' + err.message)
      setSubmitting(false)
    }
  }

  if (!quizData || !quizData.questions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4"
          >
            <Loader className="text-indigo-500" size={28} />
          </motion.div>
          <p className="text-slate-600 font-semibold text-lg">Loading quiz...</p>
          <p className="text-slate-400 text-sm mt-1">Preparing your questions</p>
        </motion.div>
      </div>
    )
  }

  const q = quizData.questions[currentQ]
  const progress = ((currentQ + 1) / quizData.questions.length) * 100
  const answeredCount = Object.keys(answers).length
  const isAnswered = !!answers[q.id]
  const totalTime = (quizData?.timeLimit || 30) * 60
  const timeProgress = (timeLeft / totalTime) * 100

  const pageVariants = {
    initial: { opacity: 0, x: 80, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, x: -80, scale: 0.98, transition: { duration: 0.2 } }
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 sm:p-6"
      style={{ background: 'linear-gradient(135deg, #f8f9fc 0%, #eef2ff 50%, #f5f3ff 100%)' }}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 mb-6">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-lg p-5 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title & Question Counter */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {quizData.title}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Question {currentQ + 1} of {quizData.questions.length} • {answeredCount} answered
                </p>
              </div>
            </div>

            {/* Timer */}
            <motion.div 
              animate={timeLeft < 60 ? { scale: [1, 1.05, 1] } : {}}
              transition={timeLeft < 60 ? { duration: 1, repeat: Infinity } : {}}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-lg ${
                timeLeft < 60
                  ? 'bg-red-50 text-red-600 border-2 border-red-200 shadow-red-100 shadow-md'
                  : timeLeft < 300
                  ? 'bg-amber-50 text-amber-600 border-2 border-amber-200'
                  : 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200'
              }`}
            >
              <Timer size={20} />
              <span className="font-mono tabular-nums">{formatTime(timeLeft)}</span>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progress</span>
              <span className="text-[11px] font-bold text-indigo-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)' }}
              />
            </div>
            {/* Question dots */}
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {quizData.questions.map((question, idx) => (
                <motion.button
                  key={question.id}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentQ(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                    idx === currentQ 
                      ? 'bg-indigo-600 ring-4 ring-indigo-200 scale-125' 
                      : answers[question.id] 
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Question ${idx + 1}${answers[question.id] ? ' ✓' : ''}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6"
          >
            {/* Question Header */}
            <div 
              className="border-b border-slate-100 p-6 sm:p-8"
              style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff, #fdf4ff)' }}
            >
              <div className="flex items-start gap-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md"
                >
                  {currentQ + 1}
                </motion.div>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {q.questionText}
                  </h2>
                  {q.questionType === 'MCQ' && (
                    <p className="text-sm text-slate-500 mt-2 flex items-center gap-1.5">
                      <CheckCircle size={14} />
                      Select the correct answer
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Question Body */}
            <div className="p-6 sm:p-8">
              {q.questionType === 'MCQ' ? (
                <div className="space-y-3">
                  {q.options?.map((opt, idx) => {
                    const isSelected = answers[q.id]?.selectedOption === idx
                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleAnswer(q.id, { selectedOption: idx })}
                        className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md'
                        }`}
                      >
                        {/* Option Letter */}
                        <motion.div
                          animate={isSelected ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ duration: 0.3 }}
                          className={`flex-shrink-0 w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm transition-all duration-200 ${
                            isSelected
                              ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                          }`}
                        >
                          {optionLetters[idx]}
                        </motion.div>

                        {/* Option Text */}
                        <div className="flex-1 pt-1.5">
                          <p className={`font-medium text-[15px] leading-relaxed ${
                            isSelected ? 'text-indigo-900' : 'text-slate-700'
                          }`}>
                            {opt}
                          </p>
                        </div>

                        {/* Check Icon */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center"
                          >
                            <CheckCircle size={16} className="text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl p-5 border-2 border-slate-200 bg-slate-50/50 focus-within:border-indigo-500 focus-within:bg-white transition-all duration-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Type your answer</p>
                    <textarea
                      className="w-full p-0 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-slate-800 font-medium placeholder:text-slate-400"
                      rows={6}
                      placeholder="Type your detailed answer here..."
                      value={answers[q.id]?.answerText || ''}
                      onChange={e => handleAnswer(q.id, { answerText: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{(answers[q.id]?.answerText || '').length} characters</span>
                    <span className="text-indigo-500 font-medium">Be detailed for better scoring</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronLeft size={18} />
            Previous
          </motion.button>

          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-3.5 font-medium shadow-sm">
            <CheckCircle size={14} className="mr-2 text-emerald-500" />
            {answeredCount} of {quizData.questions.length} answered
          </div>

          {currentQ < quizData.questions.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 12px 24px rgba(99,102,241,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentQ(prev => Math.min(quizData.questions.length - 1, prev + 1))}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Next
              <ChevronRight size={18} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 12px 24px rgba(16,185,129,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowConfirmSubmit(true)}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold rounded-xl shadow-lg transition-all disabled:cursor-not-allowed"
            >
              {submitting ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </motion.button>
          )}
        </div>

        {/* Submit Confirmation Modal */}
        <AnimatePresence>
          {showConfirmSubmit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowConfirmSubmit(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
              >
                {/* Top gradient */}
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #10b981, #14b8a6)' }} />

                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-amber-100 rounded-xl">
                      <AlertCircle className="text-amber-600" size={22} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Submit Quiz?</h3>
                  </div>

                  <p className="text-slate-600 mb-4">You're about to submit your quiz. This action cannot be undone.</p>

                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 mb-5 border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900 mb-2">📋 Summary</p>
                    <div className="flex justify-between">
                      <span>Questions answered:</span>
                      <span className="font-bold text-indigo-600">{answeredCount}/{quizData.questions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time remaining:</span>
                      <span className="font-bold text-emerald-600">{formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  {answeredCount < quizData.questions.length && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 text-sm text-amber-800 flex items-start gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>You have <strong>{quizData.questions.length - answeredCount}</strong> unanswered questions.</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConfirmSubmit(false)}
                      className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Keep Going
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowConfirmSubmit(false)
                        handleSubmit()
                      }}
                      disabled={submitting}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl disabled:from-slate-400 disabled:to-slate-400 transition-all shadow-lg"
                    >
                      {submitting ? 'Submitting...' : 'Submit ✓'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default QuizTaking
