import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Clock, BookOpen, Target, Play, Loader,
  AlertCircle, Zap, Trophy, BarChart3, RefreshCw,
  ChevronRight, Sparkles, Star, Users, CheckCircle2,
  TrendingUp, Award, Filter
} from 'lucide-react'
import { API_BASE } from '../api/api'
import { getAuthHeaders } from '../api/request'

/* ─── Difficulty config ─── */
const DIFF = {
  EASY:   { label: 'Easy',   text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500', bar: 'from-emerald-400 to-emerald-600', barW: '33%',  ring: 'shadow-emerald-200/60' },
  MEDIUM: { label: 'Medium', text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   dot: 'bg-amber-500',   bar: 'from-amber-400 to-amber-600',     barW: '66%',  ring: 'shadow-amber-200/60'   },
  HARD:   { label: 'Hard',   text: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     dot: 'bg-red-500',     bar: 'from-red-400 to-red-600',         barW: '100%', ring: 'shadow-red-200/60'     },
  MIXED:  { label: 'Mixed',  text: 'text-purple-700',  bg: 'bg-purple-50',   border: 'border-purple-200',  dot: 'bg-purple-500',  bar: 'from-purple-400 to-purple-600',   barW: '75%',  ring: 'shadow-purple-200/60'  },
}

/* ─── Skeleton Card ─── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      {/* Top gradient strip */}
      <div className="h-1.5 bg-slate-200 w-full" />
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-slate-200" />
          <div className="w-16 h-6 rounded-full bg-slate-200" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
          <div className="h-4 bg-slate-200 rounded-lg w-1/2" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-slate-200 rounded-lg" />
          <div className="h-7 w-20 bg-slate-200 rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-10 bg-slate-200 rounded" />
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full w-full" />
        </div>
        <div className="h-11 bg-slate-200 rounded-xl" />
      </div>
    </div>
  )
}

/* ─── Quiz Card ─── */
function QuizCard({ quiz, index, onStart, isStarting }) {
  const diff = DIFF[(quiz.difficulty || '').toUpperCase()] || DIFF.MEDIUM
  const questionCount = quiz.questions?.length ?? quiz.questionCount ?? 0
  const timeLimit = quiz.timeLimit || 30

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm
                 hover:shadow-xl hover:shadow-indigo-100/60 hover:border-indigo-200/70
                 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Animated top accent stripe */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Decorative glow orb */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative p-6 flex flex-col flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
                       flex items-center justify-center shadow-lg shadow-indigo-200"
          >
            <Brain size={20} className="text-white" />
          </motion.div>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border
                            ${diff.bg} ${diff.border} ${diff.text} flex-shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
            {diff.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 leading-snug mb-3
                       group-hover:text-indigo-900 transition-colors duration-200 line-clamp-2 min-h-[2.5rem]">
          {quiz.title}
        </h3>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100
                          rounded-lg text-[11px] font-semibold text-slate-600">
            <Target size={10} className="text-indigo-500" />
            {questionCount} Questions
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100
                          rounded-lg text-[11px] font-semibold text-slate-600">
            <Clock size={10} className="text-amber-500" />
            {timeLimit} min
          </div>
          {quiz.training && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100
                            rounded-lg text-[11px] font-semibold text-slate-600 max-w-full">
              <BookOpen size={10} className="text-emerald-500 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{quiz.training.title}</span>
            </div>
          )}
        </div>

        {/* Difficulty bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Difficulty Level</span>
            <span className={`text-[10px] font-bold ${diff.text}`}>{diff.label}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: diff.barW }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.08 + 0.3 }}
              className={`h-full rounded-full bg-gradient-to-r ${diff.bar}`}
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Divider */}
        <div className="border-t border-slate-100 my-4" />

        {/* CTA */}
        <motion.button
          whileHover={!isStarting ? { scale: 1.02, y: -1 } : {}}
          whileTap={!isStarting ? { scale: 0.97 } : {}}
          onClick={() => onStart(quiz)}
          disabled={isStarting}
          className="w-full flex items-center justify-center gap-2 py-3 px-5
                     bg-gradient-to-r from-indigo-600 to-purple-600
                     hover:from-indigo-500 hover:to-purple-500
                     text-white font-semibold text-sm rounded-xl
                     shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/40
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-200 group/btn"
        >
          {isStarting ? (
            <>
              <Loader size={15} className="animate-spin" />
              <span>Starting…</span>
            </>
          ) : (
            <>
              <Play size={15} className="fill-white" />
              <span>Start Quiz</span>
              <ChevronRight
                size={15}
                className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200"
              />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ─── Hero Stats Pill ─── */
function StatPill({ icon: Icon, value, label, color = 'text-white/90' }) {
  return (
    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5">
      <Icon size={16} className="text-white/80" />
      <div>
        <p className={`font-black text-xl leading-none ${color}`}>{value}</p>
        <p className="text-white/60 text-[10px] font-semibold mt-0.5">{label}</p>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
function AIQuizList({ user, onStartQuiz }) {
  const [quizzes, setQuizzes]       = useState([])
  const [fetching, setFetching]     = useState(true)
  const [error, setError]           = useState('')
  const [startingId, setStartingId] = useState(null)
  const [filter, setFilter]         = useState('ALL')

  useEffect(() => { fetchQuizzes() }, [])

  const fetchQuizzes = async () => {
    setFetching(true)
    setError('')
    try {
      const res  = await fetch(`${API_BASE}/ai-quiz/participant/quizzes`, { headers: getAuthHeaders() })
      const data = await res.json()
      setQuizzes(data.quizzes || [])
    } catch {
      setError('Failed to load quizzes. Please check your connection and try again.')
    } finally {
      setFetching(false)
    }
  }

  const handleStart = async (quiz) => {
    if (startingId) return
    setStartingId(quiz.id)
    setError('')
    try {
      const res  = await fetch(`${API_BASE}/ai-quiz/participant/start/${quiz.id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start quiz')
      const qwq = data.quiz
      if (!qwq?.questions?.length) throw new Error('This quiz has no questions yet. Please contact your trainer.')
      if (onStartQuiz) onStartQuiz(data.attemptId, qwq)
    } catch (err) {
      setError(err.message)
    } finally {
      setStartingId(null)
    }
  }

  /* Difficulty breakdown */
  const counts = quizzes.reduce((acc, q) => {
    const k = (q.difficulty || 'MEDIUM').toUpperCase()
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const filters = ['ALL', 'EASY', 'MEDIUM', 'HARD', 'MIXED']

  const filteredQuizzes = filter === 'ALL'
    ? quizzes
    : quizzes.filter(q => (q.difficulty || 'MEDIUM').toUpperCase() === filter)

  const totalTime = quizzes.reduce((s, q) => s + (q.timeLimit || 30), 0)

  return (
    <div className="w-full space-y-6" style={{ fontFamily: "'Inter', 'Outfit', sans-serif" }}>

      {/* ══════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-7 shadow-xl shadow-indigo-400/20">
        {/* Decorative blobs */}
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          {/* Top label */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-white/80 text-xs font-bold uppercase tracking-widest">AI-Powered Assessments</span>
          </div>

          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-black text-white mb-1.5 leading-tight">
                Available Quizzes
              </h2>
              <p className="text-white/70 text-sm font-medium max-w-md leading-relaxed">
                Test and validate your knowledge with intelligent AI-generated assessments tailored to your training.
              </p>
            </div>

            {/* Live stats pills */}
            {!fetching && quizzes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <StatPill icon={Trophy} value={quizzes.length} label="Quizzes Ready" />
                <div className="hidden sm:block">
                  <StatPill icon={Clock} value={`${totalTime}m`} label="Total Time" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ERROR BANNER
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700
                       rounded-xl px-4 py-3 text-sm font-medium"
          >
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchQuizzes}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600
                         hover:text-red-800 transition-colors whitespace-nowrap px-2 py-1 bg-red-100 rounded-lg"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          FILTER BAR
      ══════════════════════════════════════ */}
      {!fetching && quizzes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            <Filter size={12} />
            Filter
          </div>
          {filters.map(f => {
            const d = DIFF[f]
            const count = f === 'ALL' ? quizzes.length : (counts[f] || 0)
            if (f !== 'ALL' && count === 0) return null
            return (
              <motion.button
                key={f}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFilter(f)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200',
                  filter === f
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                {f !== 'ALL' && <span className={`w-1.5 h-1.5 rounded-full ${d?.dot || 'bg-slate-400'}`} />}
                {f === 'ALL' ? 'All Quizzes' : d?.label || f}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  filter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{count}</span>
              </motion.button>
            )
          })}
        </motion.div>
      )}

      {/* ══════════════════════════════════════
          SKELETON LOADERS
      ══════════════════════════════════════ */}
      {fetching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ══════════════════════════════════════
          EMPTY STATE
      ══════════════════════════════════════ */}
      {!fetching && !error && quizzes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-24 px-6 bg-white
                     rounded-2xl border-2 border-dashed border-slate-200 text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100
                       flex items-center justify-center mb-5 shadow-inner"
          >
            <Brain size={32} className="text-indigo-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Quizzes Yet</h3>
          <p className="text-slate-500 text-sm font-medium max-w-xs leading-relaxed mb-6">
            Quizzes will appear here when your trainers publish them. Check back soon!
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={fetchQuizzes}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border border-indigo-200
                       text-indigo-700 font-semibold text-sm rounded-xl hover:bg-indigo-100
                       transition-all duration-200"
          >
            <RefreshCw size={14} /> Refresh List
          </motion.button>
        </motion.div>
      )}

      {/* ══════════════════════════════════════
          QUIZ GRID
      ══════════════════════════════════════ */}
      {!fetching && filteredQuizzes.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredQuizzes.map((quiz, i) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                index={i}
                onStart={handleStart}
                isStarting={startingId === quiz.id}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* No results for filter */}
      {!fetching && quizzes.length > 0 && filteredQuizzes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-slate-500 text-sm font-medium"
        >
          No quizzes found for this difficulty. Try a different filter.
        </motion.div>
      )}

      {/* ══════════════════════════════════════
          STATS FOOTER
      ══════════════════════════════════════ */}
      {!fetching && quizzes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: filteredQuizzes.length * 0.06 + 0.15 }}
          className="flex items-center justify-between flex-wrap gap-3
                     bg-white rounded-xl border border-slate-200/80 px-5 py-3.5 shadow-sm"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <BarChart3 size={14} className="text-indigo-500" />
              <span className="font-bold">{quizzes.length}</span>
              <span className="text-slate-500 font-medium">total quizzes</span>
            </div>
            {Object.entries(counts).map(([key, cnt]) => {
              const d = DIFF[key]
              if (!d) return null
              return (
                <span key={key} className={`text-xs font-bold ${d.text} ${d.bg} border ${d.border} px-2.5 py-1 rounded-full`}>
                  {cnt} {d.label}
                </span>
              )
            })}
          </div>
          <motion.button
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
            onClick={fetchQuizzes}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400
                       hover:text-indigo-600 transition-colors duration-200 p-1.5 rounded-lg hover:bg-indigo-50"
          >
            <RefreshCw size={13} />
          </motion.button>
        </motion.div>
      )}

    </div>
  )
}

export default AIQuizList
