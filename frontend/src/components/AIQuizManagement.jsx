import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Eye, Send, FileText, Zap, CheckCircle, AlertCircle, Trophy, Loader, X, Upload, BarChart3 } from 'lucide-react'
import { useToast } from './Toast'

const AIQuizManagement = ({ quizzes = [], onAddQuiz, onEditQuiz, onDeleteQuiz, onPublish, onViewLeaderboard } = {}) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ title: '', document: null, difficulty: 'MEDIUM', questionCount: 5 })
  const [loading, setLoading] = useState(false)
  const { success, error } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingId) {
        onEditQuiz?.(editingId, formData)
        success('Quiz updated successfully!')
      } else {
        onAddQuiz?.(formData)
        success('Quiz created successfully!')
      }
      
      setFormData({ title: '', document: null, difficulty: 'MEDIUM', questionCount: 5 })
      setShowCreateModal(false)
      setEditingId(null)
    } catch (err) {
      error(err.message || 'Failed to save quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        onDeleteQuiz?.(id)
        success('Quiz deleted successfully!')
      } catch (err) {
        error('Failed to delete quiz')
      }
    }
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'EASY': return 'from-green-500 to-emerald-600'
      case 'MEDIUM': return 'from-amber-500 to-orange-600'
      case 'HARD': return 'from-red-500 to-rose-600'
      default: return 'from-slate-500 to-slate-600'
    }
  }

  const getDifficultyBadge = (difficulty) => {
    switch(difficulty) {
      case 'EASY': return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Easy' }
      case 'MEDIUM': return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Medium' }
      case 'HARD': return { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Hard' }
      default: return { bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500', label: 'Unknown' }
    }
  }

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  // Skeleton loader
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-slate-200 rounded-lg" />
        <div className="h-5 w-16 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-6 w-3/4 bg-slate-200 rounded-lg mb-3" />
      <div className="h-4 w-1/2 bg-slate-200 rounded-lg mb-6" />
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
        <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
      </div>
    </div>
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200"
          >
            <Zap className="text-white" size={24} />
          </motion.div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>AI Generated Quizzes</h2>
            <p className="text-sm text-slate-500 mt-0.5">Create and manage AI-powered quizzes</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 12px 24px rgba(99,102,241,0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingId(null)
            setFormData({ title: '', document: null, difficulty: 'MEDIUM', questionCount: 5 })
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          New Quiz
        </motion.button>
      </div>

      {/* Stats Bar */}
      {quizzes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          {[
            { label: 'Total', value: quizzes.length, icon: <FileText size={16} />, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Published', value: quizzes.filter(q => q.status === 'PUBLISHED').length, icon: <CheckCircle size={16} />, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Drafts', value: quizzes.filter(q => q.status !== 'PUBLISHED').length, icon: <Edit size={16} />, color: 'text-amber-600 bg-amber-50' },
            { label: 'Questions', value: quizzes.reduce((acc, q) => acc + (q.questionCount || 5), 0), icon: <Zap size={16} />, color: 'text-purple-600 bg-purple-50' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
              <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{stat.value}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Quiz Cards Grid */}
      {quizzes && quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((quiz, idx) => {
            const diffBadge = getDifficultyBadge(quiz.difficulty)
            return (
              <motion.div
                key={quiz.id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
                className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
              >
                {/* Top accent bar */}
                <div className={`h-1 bg-gradient-to-r ${getDifficultyColor(quiz.difficulty)}`} />
                
                {/* Content */}
                <div className="p-5">
                  {/* Status & Difficulty */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      quiz.status === 'PUBLISHED' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${quiz.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {quiz.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${diffBadge.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${diffBadge.dot}`} />
                      {diffBadge.label}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {quiz.title}
                  </h3>

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 text-sm text-slate-500 mb-5">
                    <div className="flex items-center gap-1.5">
                      <FileText size={14} className="text-slate-400" />
                      <span className="font-medium">{quiz.questionCount || 5} questions</span>
                    </div>
                    {quiz.document && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        📎 Doc
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 mb-4" />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditingId(quiz.id)
                        setFormData(quiz)
                        setShowCreateModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-sm rounded-xl transition-all border border-indigo-100"
                    >
                      <Edit size={14} />
                      Edit
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onViewLeaderboard?.(quiz.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 font-semibold text-sm rounded-xl transition-all border border-purple-100"
                    >
                      <BarChart3 size={14} />
                      Board
                    </motion.button>

                    {quiz.status === 'DRAFT' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onPublish?.(quiz.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold text-sm rounded-xl transition-all border border-emerald-100"
                      >
                        <Send size={14} />
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(quiz.id)}
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all border border-red-100"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200"
        >
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-5"
          >
            <Zap className="text-indigo-500" size={36} />
          </motion.div>
          <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>No quizzes yet</h3>
          <p className="text-slate-500 mb-6 max-w-xs mx-auto">Create your first AI-generated quiz to get started</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus size={20} />
            Create First Quiz
          </motion.button>
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)' }} />
              
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {editingId ? 'Edit Quiz' : 'Create New Quiz'}
                  </h3>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Quiz Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter quiz title"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Document Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Document (PDF/DOC)</label>
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 cursor-pointer">
                      <input
                        type="file"
                        onChange={e => setFormData({...formData, document: e.target.files?.[0]})}
                        accept=".pdf,.doc,.docx,.txt"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload size={20} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-500 font-medium">
                        {formData.document?.name || 'Drop a file or click to browse'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, DOC, DOCX, TXT</p>
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'EASY', label: 'Easy', icon: '🟢', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
                        { value: 'MEDIUM', label: 'Medium', icon: '🟠', color: 'border-amber-400 bg-amber-50 text-amber-700' },
                        { value: 'HARD', label: 'Hard', icon: '🔴', color: 'border-red-400 bg-red-50 text-red-700' },
                      ].map(d => (
                        <motion.button
                          key={d.value}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setFormData({...formData, difficulty: d.value})}
                          className={`p-3 rounded-xl border-2 text-center font-semibold text-sm transition-all ${
                            formData.difficulty === d.value 
                              ? d.color + ' shadow-sm' 
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base">{d.icon}</span>
                          <p className="mt-1">{d.label}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Question Count */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.questionCount}
                      onChange={e => setFormData({...formData, questionCount: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader size={16} className="animate-spin" /> : null}
                      {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default AIQuizManagement
