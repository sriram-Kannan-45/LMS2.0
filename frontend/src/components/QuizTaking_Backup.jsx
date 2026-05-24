import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Zap, Loader, Target, Flame, Brain } from 'lucide-react'
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
      <div className="flex items-center justify-center min-h-[60vh] bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-sm w-full"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-6 text-indigo-600"
          >
            <Loader size={28} />
          </motion.div>
          <p className="text-slate-800 font-bold text-lg">Loading Quiz</p>
          <p className="text-slate-500 text-xs mt-2">Preparing your assessment environment...</p>
        </motion.div>
      </div>
    )
  }

  const q = quizData.questions[currentQ]
  const progressPercent = ((currentQ + 1) / quizData.questions.length) * 100
  const answeredCount = Object.keys(answers).length
  const unansweredCount = quizData.questions.length - answeredCount
  const answeredPercent = (answeredCount / quizData.questions.length) * 100

  const getTimeColor = () => {
    if (timeLeft < 300) return 'text-red-600 bg-red-50 border-red-100'
    if (timeLeft < 600) return 'text-amber-600 bg-amber-50 border-amber-100'
    return 'text-indigo-600 bg-indigo-50/50 border-indigo-100'
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  // Math for 180-degree Gauge (Radius = 38, Circumference ≈ 238.76, Semi-circle Arc Length ≈ 119.38)
  const strokeDasharray = 119.38
  const strokeDashoffset = strokeDasharray * (1 - progressPercent / 100)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full relative space-y-6"
    >
      {/* High-Fidelity Sub-Header Ribbon Card */}
      <div className="sticky top-[60px] z-30 backdrop-blur-md bg-white/90 border border-slate-100/80 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02)] transition-all duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Side: Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100/50 text-[11px] font-bold tracking-wide">
              <Zap size={11} className="fill-indigo-600/10" />
              AI Assessment
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200/60 text-[11px] font-bold">
              Question {currentQ + 1} of {quizData.questions.length}
            </span>
          </div>

          {/* Right Side: Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Answered Count Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/70 text-emerald-700 rounded-full border border-emerald-100/60 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {answeredCount} / {quizData.questions.length} Answered
            </div>

            {/* Remaining Count Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/70 text-amber-700 rounded-full border border-amber-100/60 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {unansweredCount} Remaining
            </div>

            {/* Live Countdown Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${getTimeColor()}`}>
              <Clock size={13} />
              <span className="font-mono tracking-wide">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) - Question & Options */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Question Card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex items-start gap-4">
                  {/* Circular Purple Question Indicator */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {currentQ + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug tracking-tight mb-3">
                      {q.questionText}
                    </h2>
                    {q.questionType === 'MCQ' && (
                      <p className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                        <Target size={13} className="text-indigo-400" />
                        Select the most accurate option
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {q.questionType === 'MCQ' ? (
                  <>
                    {q.options?.map((opt, idx) => {
                      const isSelected = answers[q.id]?.selectedOption === idx
                      return (
                        <motion.button
                          key={idx}
                          whileHover={!isSelected ? { scale: 1.005 } : {}}
                          whileTap={{ scale: 0.995 }}
                          onClick={() => handleAnswer(q.id, { selectedOption: idx })}
                          className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 relative overflow-hidden ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                              : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50/10'
                          }`}
                        >
                          {/* Selected Left Vertical Accent Bar */}
                          {isSelected && (
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-600" />
                          )}

                          {/* Option Badge */}
                          <div className={`flex-shrink-0 w-8 h-8 min-w-[32px] min-h-[32px] aspect-square rounded-full font-bold flex items-center justify-center text-xs transition-colors duration-200 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                          }`}>
                            {optionLetters[idx] || String.fromCharCode(65 + idx)}
                          </div>

                          {/* Option Text */}
                          <div className="flex-1">
                            <p className={`text-sm sm:text-[14.5px] font-semibold leading-relaxed transition-colors duration-200 ${
                              isSelected ? 'text-indigo-950 font-bold' : 'text-slate-600'
                            }`}>
                              {opt}
                            </p>
                          </div>

                          {/* High-Fidelity Radio Button Checkmark */}
                          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full border border-indigo-600 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-slate-200" />
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </>
                ) : (
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 block">Your Written Answer</label>
                    <textarea
                      className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white resize-none text-sm text-slate-700 placeholder:text-slate-400 min-h-[160px] transition-all"
                      placeholder="Type your detailed assessment answer here..."
                      value={answers[q.id]?.answerText || ''}
                      onChange={e => handleAnswer(q.id, { answerText: e.target.value })}
                    />
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                      <span>{(answers[q.id]?.answerText || '').length} characters</span>
                      <span className="text-indigo-500">Provide detailed answers for high-quality grading</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action Row inside Left Column (Mockup Alignment) */}
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all text-xs shadow-sm"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            {currentQ < quizData.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(Math.min(quizData.questions.length - 1, currentQ + 1))}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs"
              >
                <span>Next Question</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-750 hover:to-violet-750 text-white font-bold rounded-lg shadow-sm disabled:opacity-60 transition-all text-xs"
              >
                {submitting ? <Loader size={14} className="animate-spin" /> : <span>Submit Assessment</span>}
              </button>
            )}
          </div>
        </div>

        {/* Right Column (1/3) - Progress Arc, Matrix navigator & AI insights */}
        <div className="space-y-6">
          
          {/* Card 1: Performance Overview (Semi-circle Progress Gauge) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
            <h3 className="text-left text-xs font-bold text-slate-700 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Performance Overview
            </h3>
            
            <div className="relative w-28 h-28 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <motion.circle 
                  cx="50" cy="50" r="38" fill="none" stroke="url(#circleGradient)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray="238.76" 
                  strokeDashoffset={238.76 * (1 - progressPercent / 100)}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {Math.round(progressPercent)}%
                </span>
              </div>
            </div>

            {/* Three column mini stats inside Gauge card */}
            <div className="grid grid-cols-3 gap-1.5 border-t border-slate-50 pt-4 mt-1 text-[11px] font-bold">
              <div className="text-center">
                <p className="text-emerald-600">{answeredCount}</p>
                <p className="text-slate-400 font-semibold text-[9.5px]">Answered</p>
              </div>
              <div className="text-center border-l border-r border-slate-100">
                <p className="text-amber-500">{unansweredCount}</p>
                <p className="text-slate-400 font-semibold text-[9.5px]">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-indigo-600 font-mono">{formatTime(timeLeft)}</p>
                <p className="text-slate-400 font-semibold text-[9.5px]">Time Left</p>
              </div>
            </div>
          </div>

          {/* Card 2: Question Navigator Grid */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Question Navigator
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {quizData.questions.map((question, idx) => {
                const isActive = idx === currentQ
                const isAnswered = !!answers[question.id]
                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQ(idx)}
                    className={`w-full aspect-square rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/20 relative'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100/50'
                        : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                    title={`Question ${idx + 1}${isAnswered ? ' ✓' : ''}`}
                  >
                    <span>{idx + 1}</span>
                    {/* Active Question small orange dot under number */}
                    {isActive && (
                      <span className="w-1 h-1 rounded-full bg-amber-400 absolute bottom-1.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card 3: Answered Progress Horizontal Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span style={{ fontFamily: 'Outfit, sans-serif' }}>Answered Progress</span>
              <span className="text-indigo-600 font-extrabold">{answeredCount} / {quizData.questions.length}</span>
            </div>
            
            {/* Slim progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${answeredPercent}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold tracking-wide">
              <span>COMPLETION: {Math.round(answeredPercent)}%</span>
              <span>REMAINING: {unansweredCount}</span>
            </div>
          </div>

          {/* Card 4: AI Insight Panel */}
          <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5">
              <Brain size={14} className="text-indigo-600" />
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Insight</p>
            </div>
            <p className="text-xs text-indigo-950/80 leading-relaxed font-semibold">
              You're making <span className="text-indigo-600 font-extrabold">{Math.round((answeredCount / (currentQ + 1)) * 100)}%</span> progress relative to the current position! Keep focused on the remaining questions.
            </p>
          </div>

        </div>

      </div>

      {/* Floating Center Footer Centered Label */}
      <div className="w-full text-center py-2 text-xs font-bold text-slate-400/90 tracking-wide select-none">
        <span className="text-emerald-500">{answeredCount} Answered</span>
        <span className="mx-2">•</span>
        <span className="text-amber-500">{unansweredCount} Remaining</span>
      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
            onClick={() => setShowConfirmSubmit(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100"
            >
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                    <CheckCircle2 className="text-indigo-500" size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Submit Assessment?</h2>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Summary</p>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Answered Questions:</span>
                    <span className="text-indigo-600">{answeredCount} / {quizData.questions.length}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Time Remaining:</span>
                    <span className="text-emerald-600">{formatTime(timeLeft)}</span>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mb-5 flex gap-3 items-start"
                  >
                    <span className="text-amber-500 mt-0.5">⚠️</span>
                    <div>
                      <p className="text-xs text-amber-800 font-bold">You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}</p>
                      <p className="text-[11px] text-amber-600/90 mt-0.5 font-medium">Unanswered questions will receive 0 points.</p>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowConfirmSubmit(false)}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-all text-xs shadow-sm"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowConfirmSubmit(false)
                      handleSubmit()
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-60 transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    {submitting ? <Loader size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
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
