import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2,
  Zap, Loader, Target, Brain, AlertTriangle, Send,
  BookOpen, BarChart2, Eye
} from 'lucide-react'
import { useToast } from './Toast'
import { API_BASE } from '../api/api'
import { getAuthHeaders } from '../api/request'

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════ */

/** Animated radial progress ring */
function RadialProgress({ percent, size = 120, stroke = 9, urgent = false, warning = false, children }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - percent / 100)

  const gradId = `ringGrad-${size}`
  const gradStart = urgent ? '#ef4444' : warning ? '#f59e0b' : '#6366f1'
  const gradEnd   = urgent ? '#f97316' : warning ? '#f97316' : '#a855f7'
  const trackColor = urgent ? '#fee2e2' : warning ? '#fef3c7' : '#e2e8f0'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradStart} />
            <stop offset="100%" stopColor={gradEnd} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={`url(#${gradId})`} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/** Stat chip */
function StatChip({ icon: Icon, label, value, colorClass, bgClass, borderClass }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-full border text-xs font-semibold ${bgClass} ${borderClass} ${colorClass}`}>
      {Icon && <Icon size={13} />}
      <span className="font-bold text-sm">{value}</span>
      <span className="opacity-75 hidden sm:inline text-xs">{label}</span>
    </div>
  )
}

/** MCQ Option Button */
function OptionButton({ letter, text, isSelected, isCorrect, isWrong, onClick, index, disabled }) {
  const baseClasses = [
    'group w-full text-left rounded-2xl border-2 transition-all duration-200',
    'flex items-center gap-4 px-6 py-5 cursor-pointer relative overflow-hidden',
    'min-h-[80px] sm:min-h-[60px]',
  ]

  const stateClasses = isSelected
    ? 'border-indigo-600 bg-gradient-to-r from-indigo-100 to-purple-100 shadow-lg shadow-indigo-200/70'
    : 'border-slate-200/80 bg-white/90 hover:border-indigo-400 hover:bg-white hover:shadow-md hover:shadow-indigo-100/40'

  return (
    <motion.button
      layout
      onClick={disabled ? undefined : onClick}
      whileHover={!isSelected && !disabled ? { scale: 1.01, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.08 }}
      className={[...baseClasses, stateClasses, disabled ? 'cursor-default' : ''].join(' ')}
      aria-pressed={isSelected}
    >
      {/* Left accent bar on selection */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            key="accent"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-600 to-purple-700 rounded-r-md origin-top"
          />
        )}
      </AnimatePresence>

      {/* Letter badge */}
      <div className={[
        'flex-shrink-0 w-12 h-12 rounded-xl font-bold text-base flex items-center justify-center',
        'transition-all duration-200 select-none shadow-sm',
        isSelected
          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-300'
          : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-200 group-hover:text-indigo-700',
      ].join(' ')}>
        {letter}
      </div>

      {/* Text */}
      <p className={[
        'flex-1 text-base sm:text-lg font-medium leading-relaxed transition-colors duration-200',
        isSelected ? 'text-indigo-950 font-semibold' : 'text-slate-700',
      ].join(' ')}>
        {text}
      </p>

      {/* Radio indicator */}
      <div className={[
        'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm',
        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-indigo-500',
      ].join(' ')}>
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
      </div>
    </motion.button>
  )
}

/** Question navigator cell */
function NavCell({ index, isActive, isAnswered, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={`Question ${index + 1}${isAnswered ? ' — Answered' : ''}`}
      aria-label={`Go to question ${index + 1}`}
      aria-current={isActive ? 'true' : undefined}
      className={[
        'aspect-square w-full rounded-xl text-xs font-bold',
        'flex items-center justify-center relative transition-all duration-200 cursor-pointer',
        isActive
          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200'
          : isAnswered
          ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-100'
          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700',
      ].join(' ')}
    >
      {index + 1}
      {isActive && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
      {isAnswered && !isActive && (
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
      )}
    </motion.button>
  )
}

/** Loading skeleton for quiz */
function QuizSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-5">
      {/* Top bar skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="h-1 bg-slate-200 rounded-full mb-4 w-2/3" />
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-24 bg-slate-200 rounded-full" />
            <div className="h-7 w-20 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>
      {/* Question card skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-5 bg-slate-200 rounded w-3/4" />
            <div className="h-5 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-14 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
function QuizTaking({ quizId, attemptId, quizData, onSubmit }) {
  const [currentQ, setCurrentQ]               = useState(0)
  const [answers, setAnswers]                 = useState({})
  const [timeLeft, setTimeLeft]               = useState((quizData?.timeLimit || 30) * 60)
  const [submitting, setSubmitting]           = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const timerRef = useRef(null)
  const { error: showError, success: showSuccess } = useToast()

  /* Timer */
  useEffect(() => {
    if (timeLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 }
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

  const handleAnswer = (questionId, value) =>
    setAnswers(prev => ({ ...prev, [questionId]: value }))

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    const answerArray = Object.entries(answers).map(([questionId, val]) => ({
      questionId: parseInt(questionId),
      selectedOption: val.selectedOption !== undefined ? val.selectedOption : null,
      answerText: val.answerText || null,
    }))
    try {
      const r = await fetch(`${API_BASE}/ai-quiz/participant/submit/${attemptId}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray }),
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
  }, [submitting, answers, attemptId, onSubmit])

  /* Loading state */
  if (!quizData || !quizData.questions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-10 bg-white rounded-3xl border border-slate-100 shadow-xl max-w-xs w-full"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-5 text-indigo-600"
          >
            <Loader size={28} />
          </motion.div>
          <p className="text-slate-800 font-bold text-lg mb-1">Loading Quiz</p>
          <p className="text-slate-400 text-sm">Preparing your assessment...</p>
        </motion.div>
      </div>
    )
  }

  /* Derived values */
  const questions        = quizData.questions
  const q                = questions[currentQ]
  const total            = questions.length
  const answeredCount    = Object.keys(answers).length
  const unansweredCount  = total - answeredCount
  const answeredPercent  = Math.round((answeredCount / total) * 100)
  const progressPercent  = Math.round(((currentQ + 1) / total) * 100)
  const isLastQuestion   = currentQ === total - 1
  const isAnsweredCurrent = !!answers[q.id]

  const timerIsUrgent  = timeLeft < 300
  const timerIsWarning = timeLeft < 600 && !timerIsUrgent

  const timerColors = timerIsUrgent
    ? { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', grad: 'from-red-500 to-orange-500' }
    : timerIsWarning
    ? { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', grad: 'from-amber-500 to-orange-400' }
    : { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', grad: 'from-indigo-500 to-purple-600' }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const goNext = () => setCurrentQ(prev => Math.min(total - 1, prev + 1))
  const goPrev = () => setCurrentQ(prev => Math.max(0, prev - 1))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
      style={{ fontFamily: "'Inter', 'Outfit', sans-serif" }}
    >

      {/* ══════════════════════════════════════
          STICKY TOP STATUS BAR
      ══════════════════════════════════════ */}
      <div className="sticky top-0 z-30 mb-6">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          {/* Animated progress stripe */}
          <div className="h-1.5 bg-slate-100 w-full">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="px-5 py-4 sm:px-6 flex flex-wrap items-center gap-4 justify-between">
            {/* Left: Quiz identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate max-w-[180px] sm:max-w-xs">
                  {quizData.title || 'AI Assessment'}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Question <span className="text-indigo-600 font-bold text-sm">{currentQ + 1}</span> of {total}
                </p>
              </div>
            </div>

            {/* Right: Live stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatChip
                icon={CheckCircle2}
                value={answeredCount}
                label={`/ ${total} done`}
                colorClass="text-emerald-700"
                bgClass="bg-emerald-50"
                borderClass="border-emerald-200"
              />
              <motion.div
                animate={timerIsUrgent ? { scale: [1, 1.05, 1] } : {}}
                transition={timerIsUrgent ? { repeat: Infinity, duration: 0.8 } : {}}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-bold ${timerColors.text} ${timerColors.bg} ${timerColors.border}`}
              >
                <Clock size={13} />
                <span className="font-mono font-bold text-sm tracking-wider">{formatTime(timeLeft)}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MAIN GRID LAYOUT
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ──────────────────────────────────
            LEFT: QUESTION + OPTIONS + NAV
        ────────────────────────────────── */}
        <div className="space-y-4">

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`question-${q.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Top accent strip */}
                <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />

                {/* Question header */}
                <div className="px-5 py-6 sm:px-8 sm:py-8 border-b border-slate-100 flex items-start gap-5">
                  {/* Number badge */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-300">
                    {currentQ + 1}
                  </div>
                  <div className="flex-1 pt-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Zap size={10} /> AI Assessment
                      </span>
                      {q.questionType === 'MCQ' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-xs font-semibold">
                          <Target size={10} /> Multiple Choice
                        </span>
                      )}
                      {q.questionType === 'TEXT' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                          <BookOpen size={10} /> Written Answer
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-950 leading-snug">
                      {q.questionText}
                    </h2>
                  </div>
                </div>

                {/* Options / Answer section */}
                <div className="px-5 py-6 sm:px-8 sm:py-8">
                  {q.questionType === 'MCQ' ? (
                    <>
                      <p className="text-sm font-bold text-slate-500 mb-5 uppercase tracking-wider">
                        Select the best answer
                      </p>
                      <div className="space-y-4">
                        {q.options?.map((opt, idx) => (
                          <OptionButton
                            key={idx}
                            index={idx}
                            letter={optionLetters[idx] || String.fromCharCode(65 + idx)}
                            text={opt}
                            isSelected={answers[q.id]?.selectedOption === idx}
                            onClick={() => handleAnswer(q.id, { selectedOption: idx })}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                        Your Written Answer
                      </label>
                      <textarea
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base text-slate-800
                                   placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-indigo-500
                                   focus:bg-white resize-none transition-all duration-200 min-h-[180px] leading-relaxed"
                        placeholder="Type your detailed assessment answer here..."
                        value={answers[q.id]?.answerText || ''}
                        onChange={e => handleAnswer(q.id, { answerText: e.target.value })}
                      />
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">
                          {(answers[q.id]?.answerText || '').length} characters
                        </span>
                        <span className="text-sm text-indigo-600 font-semibold flex items-center gap-1">
                          <Zap size={12} /> Detailed answers earn more points
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom navigation bar (inside card) */}
                <div className="px-5 py-5 sm:px-8 sm:py-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4">

                  {/* Previous */}
                  <motion.button
                    whileHover={currentQ > 0 ? { scale: 1.03 } : {}}
                    whileTap={currentQ > 0 ? { scale: 0.96 } : {}}
                    onClick={goPrev}
                    disabled={currentQ === 0}
                    aria-label="Previous question"
                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-300 text-slate-700
                               font-semibold text-base rounded-xl hover:border-slate-400 hover:text-slate-900 hover:shadow-md
                               disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 min-h-[48px]"
                  >
                    <ChevronLeft size={18} />
                    <span className="hidden sm:inline">Previous</span>
                  </motion.button>

                  {/* Dot indicators */}
                  <div className="hidden sm:flex items-center gap-1.5 flex-1 justify-center overflow-x-auto max-w-[240px] py-1">
                    {questions.slice(0, 12).map((_, idx) => {
                      const isDone = !!answers[questions[idx].id]
                      return (
                        <button
                          key={idx}
                          onClick={() => setCurrentQ(idx)}
                          aria-label={`Go to question ${idx + 1}`}
                          className={[
                            'rounded-full transition-all duration-200 cursor-pointer flex-shrink-0',
                            idx === currentQ
                              ? 'bg-indigo-600 w-6 h-3'
                              : isDone
                              ? 'bg-emerald-500 w-2.5 h-2.5'
                              : 'bg-slate-300 w-2.5 h-2.5 hover:bg-slate-400',
                          ].join(' ')}
                        />
                      )
                    })}
                    {total > 12 && (
                      <span className="text-xs text-slate-400 font-bold ml-2">+{total - 12}</span>
                    )}
                  </div>

                  {/* Next / Submit */}
                  {!isLastQuestion ? (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={goNext}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600
                                 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-base rounded-xl
                                 shadow-lg shadow-indigo-300/50 transition-all duration-200 min-h-[48px]"
                    >
                      <span>Next</span>
                      <ChevronRight size={18} />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowConfirmSubmit(true)}
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600
                                 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-base rounded-xl
                                 shadow-lg shadow-emerald-300/50 disabled:opacity-60 transition-all duration-200 min-h-[48px]"
                    >
                      {submitting
                        ? <><Loader size={18} className="animate-spin" /><span>Submitting…</span></>
                        : <><Send size={18} /><span>Submit Quiz</span></>
                      }
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Mobile question navigator strip */}
          <div className="xl:hidden bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Question Navigator</p>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 inline-block" />
                  Current
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Done
                </span>
              </div>
            </div>
            <div
              className="grid gap-2.5"
              style={{ gridTemplateColumns: `repeat(${Math.min(total, 10)}, minmax(0, 1fr))` }}
            >
              {questions.map((question, idx) => (
                <NavCell
                  key={question.id}
                  index={idx}
                  isActive={idx === currentQ}
                  isAnswered={!!answers[question.id]}
                  onClick={() => setCurrentQ(idx)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────
            RIGHT SIDEBAR
        ────────────────────────────────── */}
        <div className="hidden xl:flex flex-col gap-4">

          {/* 1. Completion Ring + Timer */}
          <div className={`rounded-2xl border shadow-sm p-6 transition-colors duration-500 ${timerIsUrgent ? 'bg-red-50 border-red-300' : timerIsWarning ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200/80'}`}>
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-5">
              Progress
            </h3>

            {/* Ring */}
            <div className="flex justify-center mb-6">
              <RadialProgress
                percent={answeredPercent}
                size={140}
                stroke={11}
                urgent={timerIsUrgent}
                warning={timerIsWarning}
              >
                <span className="text-4xl font-black text-slate-900">{answeredPercent}%</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">done</span>
              </RadialProgress>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 pt-5 border-t border-slate-100">
              {[
                { label: 'Answered', value: answeredCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Remaining', value: unansweredCount, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Time', value: formatTime(timeLeft), color: timerColors.text, bg: timerColors.bg, mono: true },
              ].map(({ label, value, color, bg, mono }) => (
                <div key={label} className={`${bg} rounded-xl px-3 py-4 text-center`}>
                  <p className={`${color} ${mono ? 'font-mono' : ''} text-lg font-black leading-none`}>{value}</p>
                  <p className="text-slate-400 text-xs font-semibold mt-2 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Question Navigator */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Navigator
              </h3>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 inline-block" />
                  Active
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Done
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((question, idx) => (
                <NavCell
                  key={question.id}
                  index={idx}
                  isActive={idx === currentQ}
                  isAnswered={!!answers[question.id]}
                  onClick={() => setCurrentQ(idx)}
                />
              ))}
            </div>
          </div>

          {/* 3. Progress bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Completion</h3>
              <span className="text-sm font-bold text-indigo-600">{answeredCount} / {total}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${answeredPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500 font-semibold">{answeredPercent}% complete</span>
              <span className="text-xs text-slate-500 font-semibold">{unansweredCount} remaining</span>
            </div>
          </div>

          {/* 4. AI Insight card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-200/50 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Brain size={16} className="text-white" />
              </div>
              <p className="text-sm font-bold text-indigo-900 uppercase tracking-wider">AI Insight</p>
            </div>
            <p className="text-base text-indigo-950 leading-relaxed font-medium">
              {answeredCount === 0
                ? 'Start answering questions to track your progress here.'
                : answeredCount === total
                ? "Great work! You've answered every question. Review before submitting."
                : `You've answered ${answeredCount} of ${total}. ${unansweredCount} more to go — keep it up!`
              }
            </p>
            {answeredCount > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-200/60 flex items-center gap-3">
                <div className="h-2 flex-1 bg-indigo-200/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                    animate={{ width: `${answeredPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-bold text-indigo-800">{answeredPercent}%</span>
              </div>
            )}
          </div>

          {/* 5. Submit button in sidebar */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowConfirmSubmit(true)}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 px-5
                       bg-gradient-to-r from-emerald-600 to-teal-600
                       hover:from-emerald-500 hover:to-teal-500
                       text-white font-bold text-base rounded-xl
                       shadow-lg shadow-emerald-300/60 disabled:opacity-60 transition-all duration-200"
          >
            {submitting
              ? <><Loader size={18} className="animate-spin" /><span>Submitting…</span></>
              : <><Send size={18} /><span>Submit Quiz</span></>
            }
          </motion.button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SUBMIT CONFIRMATION MODAL
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !submitting && setShowConfirmSubmit(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 28 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 14 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl shadow-slate-900/20 w-full max-w-md overflow-hidden border border-slate-200/60"
            >
              {/* Top accent stripe */}
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />

              <div className="p-8 sm:p-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-7">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-300 flex-shrink-0">
                    <Send size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">Submit Quiz?</h2>
                    <p className="text-base text-slate-500 mt-1">This action cannot be undone.</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 mb-6 space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submission Summary</p>
                  {[
                    { label: 'Questions Answered', value: `${answeredCount} / ${total}`, color: 'text-indigo-600' },
                    { label: 'Time Remaining', value: formatTime(timeLeft), color: timerColors.text, mono: true },
                    { label: 'Completion', value: `${answeredPercent}%`, color: 'text-emerald-600' },
                  ].map(({ label, value, color, mono }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-base text-slate-600 font-medium">{label}</span>
                      <span className={`text-lg font-bold ${color} ${mono ? 'font-mono' : ''}`}>{value}</span>
                    </div>
                  ))}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${answeredPercent}%` }}
                    />
                  </div>
                </div>

                {/* Warning if unanswered */}
                <AnimatePresence>
                  {unansweredCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 items-start bg-amber-50 border border-amber-300 rounded-xl p-5 mb-6"
                    >
                      <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-base font-bold text-amber-950">
                          {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-amber-800 mt-1 font-medium">
                          Skipped questions will score 0 points.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowConfirmSubmit(false)}
                    disabled={submitting}
                    className="flex-1 py-4 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl
                               hover:bg-slate-100 hover:border-slate-400 transition-all duration-200 text-base disabled:opacity-50"
                  >
                    Continue Quiz
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setShowConfirmSubmit(false); handleSubmit() }}
                    disabled={submitting}
                    className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500
                               hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-300
                               transition-all duration-200 text-base flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting
                      ? <><Loader size={18} className="animate-spin" /><span>Submitting…</span></>
                      : <><CheckCircle2 size={18} /><span>Submit Now</span></>
                    }
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
