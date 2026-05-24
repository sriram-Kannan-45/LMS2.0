import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE } from '../api/api'
import { getAuthHeaders } from '../api/request'
import QuizTaking from '../components/QuizTaking'
import { Sparkles, Brain, Trophy, BarChart3, ArrowRight, Search, Filter, Clock, BookOpen, Target, Zap, LogOut, Bell, Settings } from 'lucide-react'

/* ─────────────────── DESIGN TOKENS ─────────────────── */
const colors = {
  primary: '#7C3AED',      // Purple
  secondary: '#6366F1',    // Indigo
  tertiary: '#9333EA',     // Purple-600
  accent: '#06B6D4',       // Cyan
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  danger: '#EF4444',       // Red
  
  bg: {
    light: '#F5F7FF',
    lighter: '#FAFBFF',
    muted: '#EEF2FF',
  },
  
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    muted: '#9CA3AF',
  },
  
  border: '#E5E7EB',
  
  glass: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(0, 0, 0, 0.03)',
}

/* ─────────────────── FLOATING ORBS ─────────────────── */
function FloatingOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-20 left-10 w-72 h-72 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.primary}15, transparent)`,
          filter: 'blur(40px)',
        }}
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-1/2 right-10 w-96 h-96 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.secondary}10, transparent)`,
          filter: 'blur(40px)',
        }}
      />
      <motion.div
        animate={{ y: [0, -15, 0], x: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-20 left-1/2 w-80 h-80 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.accent}08, transparent)`,
          filter: 'blur(40px)',
        }}
      />
    </div>
  )
}

/* ─────────────────── MODERN HEADER ─────────────────── */
function ModernHeader({ user }) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">WAVE INIT</p>
            <p className="text-xs text-gray-500">Learning Dashboard</p>
          </div>
        </motion.div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2.5 hover:bg-white/50 rounded-lg transition-all"
          >
            <Bell size={18} className="text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 hover:bg-white/50 rounded-lg transition-all"
          >
            <Settings size={18} className="text-gray-700" />
          </motion.button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name || 'Participant'}</p>
              <p className="text-xs text-gray-500">Premium</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
              {(user?.name || 'U')[0]}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── DIFFICULTY BADGE ─────────────────── */
function DifficultyBadge({ level }) {
  const config = {
    easy: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Easy' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium' },
    hard: { bg: 'bg-red-100', text: 'text-red-700', label: 'Hard' },
  }
  const cfg = config[(level || 'easy').toLowerCase()] || config.easy
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {cfg.label}
    </span>
  )
}

/* ─────────────────── PREMIUM QUIZ CARD ─────────────────── */
function PremiumQuizCard({ quiz, index, onStart }) {
  const [isHovered, setIsHovered] = useState(false)
  
  const questionCount = quiz.questions?.length || 0
  const timeLimit = quiz.timeLimit || 30

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative h-full"
    >
      {/* Gradient border glow */}
      <div className={`absolute -inset-0.5 rounded-2xl opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}40)`,
          filter: 'blur(12px)',
        }}
      />

      {/* Card */}
      <div className="relative h-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-6 flex flex-col hover:shadow-xl transition-all duration-300"
        style={{
          boxShadow: isHovered ? `0 20px 50px rgba(99, 102, 241, 0.15)` : '0 4px 20px rgba(0, 0, 0, 0.05)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        {/* Top gradient stripe */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-0 left-0 right-0 h-1 origin-left"
          style={{
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          }}
        />

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                <Brain size={18} className="text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
              {quiz.title}
            </h3>
          </div>
          <DifficultyBadge level={quiz.difficulty} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 py-4 border-y border-gray-200/50">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Questions</div>
            <div className="text-lg font-bold text-gray-900">{questionCount}</div>
          </div>
          <div className="text-center border-l border-r border-gray-200/50">
            <div className="text-xs text-gray-500 mb-1">Time</div>
            <div className="text-lg font-bold text-gray-900">{timeLimit}m</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Type</div>
            <div className="text-lg font-bold text-gray-900">AI</div>
          </div>
        </div>

        {/* Description */}
        {quiz.description && (
          <p className="text-sm text-gray-600 mb-5 line-clamp-2">
            {quiz.description}
          </p>
        )}

        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStart(quiz.id)}
          className="mt-auto w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/30"
        >
          <span>Start Quiz</span>
          <ArrowRight size={16} />
        </motion.button>

        {/* Badge overlay on hover */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-purple-600"
        >
          <Sparkles size={16} />
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ─────────────────── WELCOME SECTION ─────────────────── */
function WelcomeSection({ quizCount, userName }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">
          Welcome back, <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{userName || 'Learner'}</span> 👋
        </h1>
        <p className="text-lg text-gray-600">
          Continue your AI-powered learning journey
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Target, label: 'Quizzes Available', value: quizCount, color: 'from-purple-600 to-indigo-600' },
          { icon: Trophy, label: 'Your Rank', value: '#—', color: 'from-amber-600 to-orange-600' },
          { icon: BarChart3, label: 'Avg Score', value: '—%', color: 'from-emerald-600 to-teal-600' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Motivational banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/30 backdrop-blur-sm"
      >
        <div className="flex items-start gap-3">
          <Zap size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Keep your streak going!</p>
            <p className="text-xs text-gray-600 mt-1">Complete at least one quiz today to maintain your learning streak.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────── EMPTY STATE ─────────────────── */
function EmptyState({ onRefresh }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="col-span-full py-24 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mx-auto mb-6"
      >
        <Brain size={40} className="text-purple-600" />
      </motion.div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">No Quizzes Yet</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        Quizzes will appear here once your instructors publish them. Check back soon for AI-powered assessments!
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRefresh}
        className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
      >
        ↻ Refresh
      </motion.button>
    </motion.div>
  )
}

/* ─────────────────── LOADING SKELETON ─────────────────── */
function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 p-6 h-80 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg mb-4 w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
          <div className="space-y-3 mb-6">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
          <div className="h-10 bg-gray-200 rounded-lg mt-auto" />
        </div>
      ))}
    </>
  )
}

/* ─────────────────── MAIN COMPONENT ─────────────────── */
export default function ParticipantQuizzesPremium({ user, onLogout }) {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [quizResult, setQuizResult] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('all')

  // Fetch quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/ai-quiz/participant/available`, {
          headers: getAuthHeaders(),
        })
        if (!response.ok) throw new Error('Failed to fetch quizzes')
        const data = await response.json()
        setQuizzes(data.quizzes || [])
        setError('')
      } catch (err) {
        console.error('Error fetching quizzes:', err)
        setError('Failed to load quizzes')
      } finally {
        setLoading(false)
      }
    }

    fetchQuizzes()
  }, [])

  // Filter quizzes
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty = filterDifficulty === 'all' || quiz.difficulty?.toLowerCase() === filterDifficulty.toLowerCase()
    return matchesSearch && matchesDifficulty
  })

  // Handle quiz start
  const handleStartQuiz = (quizId) => {
    const quiz = quizzes.find(q => q.id === quizId)
    if (quiz) {
      setActiveQuiz(quiz)
    }
  }

  // Handle quiz submission
  const handleQuizSubmit = (result) => {
    setQuizResult(result)
    setActiveQuiz(null)
  }

  // Handle back from result
  const handleBackToQuizzes = () => {
    setQuizResult(null)
  }

  // If taking quiz, show quiz taking component
  if (activeQuiz) {
    return (
      <QuizTaking
        quizId={activeQuiz.id}
        quizData={activeQuiz}
        onSubmit={handleQuizSubmit}
      />
    )
  }

  // If quiz result, show result
  if (quizResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600" />
            
            <div className="p-8">
              <div className="text-center mb-8">
                <motion.div
                  animate={{ rotate: [0, -12, 12, 0] }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-4xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
                <p className="text-gray-600">Here's your performance</p>
              </div>

              {/* Score */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 mb-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Your Score</p>
                <p className="text-4xl font-bold text-purple-600">
                  {quizResult.percentage?.toFixed(0) ?? 0}%
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-600">Questions</p>
                  <p className="text-lg font-bold text-gray-900">{quizResult.totalQuestions ?? 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-600">Correct</p>
                  <p className="text-lg font-bold text-green-600">{quizResult.answeredCount ?? 0}</p>
                </div>
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBackToQuizzes}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold transition-all"
              >
                Back to Quizzes
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Main quiz list view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <FloatingOrbs />
      
      {/* Header */}
      <ModernHeader user={user} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Welcome & Stats */}
          <div className="lg:col-span-1">
            <WelcomeSection quizCount={quizzes.length} userName={user?.name} />
          </div>

          {/* Right Column - Quiz Cards */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Difficulty Filter */}
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-4 py-3 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Quiz Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LoadingSkeleton />
              </div>
            ) : error ? (
              <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center">
                <p className="text-red-700 font-semibold">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                >
                  Retry
                </button>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="grid grid-cols-1">
                <EmptyState onRefresh={() => window.location.reload()} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredQuizzes.map((quiz, index) => (
                  <PremiumQuizCard
                    key={quiz.id}
                    quiz={quiz}
                    index={index}
                    onStart={handleStartQuiz}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
