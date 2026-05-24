import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Eye, Clock, User, Calendar, FileText, Filter, Loader, ChevronRight } from 'lucide-react'
import { useToast } from './Toast'

const AdminNoteApproval = ({ notes = [], onApprove, onReject } = {}) => {
  const [selectedNote, setSelectedNote] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, approved, rejected
  const [loading, setLoading] = useState(false)
  const [localNotes, setLocalNotes] = useState(notes)
  const { success, error } = useToast()

  // Update local state when parent prop changes
  React.useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  const filteredNotes = localNotes.filter(note => {
    if (filter === 'all') return true
    return note.status?.toLowerCase() === filter
  })

  const handleApprove = useCallback(async (noteId) => {
    setLoading(true)
    try {
      // Optimistic update - remove from pending immediately
      setLocalNotes(prev => prev.filter(note => note.id !== noteId))
      
      // Call parent handler
      await onApprove?.(noteId)
      
      success('Note approved successfully!')
      setSelectedNote(null)
    } catch (err) {
      console.error('Approve error:', err)
      // Revert optimistic update on error
      setLocalNotes(prev => [...prev, notes.find(n => n.id === noteId)].filter(Boolean))
      error('Failed to approve note')
    } finally {
      setLoading(false)
    }
  }, [onApprove, notes, success, error])

  const handleReject = useCallback(async (noteId) => {
    setLoading(true)
    try {
      // Optimistic update - remove from pending immediately
      setLocalNotes(prev => prev.filter(note => note.id !== noteId))
      
      // Call parent handler
      await onReject?.(noteId)
      
      success('Note rejected successfully!')
      setSelectedNote(null)
    } catch (err) {
      console.error('Reject error:', err)
      // Revert optimistic update on error
      setLocalNotes(prev => [...prev, notes.find(n => n.id === noteId)].filter(Boolean))
      error('Failed to reject note')
    } finally {
      setLoading(false)
    }
  }, [onReject, notes, success, error])

  const getStatusBadge = (status) => {
    switch(status?.toUpperCase()) {
      case 'PENDING': return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Pending' }
      case 'APPROVED': return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Approved' }
      case 'REJECTED': return { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Rejected' }
      default: return { bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500', label: 'Unknown' }
    }
  }

  const getStatusIcon = (status) => {
    switch(status?.toUpperCase()) {
      case 'PENDING': return <Clock size={14} />
      case 'APPROVED': return <Check size={14} />
      case 'REJECTED': return <X size={14} />
      default: return <FileText size={14} />
    }
  }

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  // Calculate filter counts from local state
  const filterCounts = {
    all: localNotes.length,
    pending: localNotes.filter(n => n.status?.toLowerCase() === 'pending').length,
    approved: localNotes.filter(n => n.status?.toLowerCase() === 'approved').length,
    rejected: localNotes.filter(n => n.status?.toLowerCase() === 'rejected').length,
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="w-full"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 sm:p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg shadow-amber-200 flex-shrink-0"
            >
              <FileText className="text-white" size={24} />
            </motion.div>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Note Approvals
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Review and manage trainer submissions</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          {[
            { key: 'all', label: 'All Notes', icon: <Filter size={14} /> },
            { key: 'pending', label: 'Pending', icon: <Clock size={14} /> },
            { key: 'approved', label: 'Approved', icon: <Check size={14} /> },
            { key: 'rejected', label: 'Rejected', icon: <X size={14} /> }
          ].map(btn => (
            <motion.button
              key={btn.key}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(btn.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                filter === btn.key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 border border-indigo-400/30'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {btn.icon}
              {btn.label}
              <span className={`ml-1 text-xs font-bold px-2 py-1 rounded-full ${
                filter === btn.key 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {filterCounts[btn.key]}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      {filteredNotes && filteredNotes.length > 0 ? (
        <div className="space-y-4 sm:space-y-5">
          {filteredNotes.map((note, idx) => {
            const badge = getStatusBadge(note.status)
            return (
              <motion.div
                key={note.id || idx}
                initial={{ opacity: 0, y: 20, x: -10 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: -10, x: 10 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                whileHover={{ x: 4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 hover:border-slate-300 transition-all group"
                style={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {(note.trainerName || 'T').charAt(0).toUpperCase()}
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {note.title}
                      </h3>
                      <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${badge.bg}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </motion.div>
                    </div>

                    {/* Trainer & Date */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="font-medium truncate">{note.trainerName || 'Unknown Trainer'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                        <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Note Preview */}
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">{note.content}</p>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedNote(note)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg hover:bg-slate-100 transition-all border border-slate-200 hover:border-slate-300"
                      >
                        <Eye size={14} />
                        <span>Preview</span>
                      </motion.button>

                      {note.status?.toUpperCase() === 'PENDING' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApprove(note.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-700 font-semibold text-xs sm:text-sm rounded-lg hover:bg-emerald-100 transition-all disabled:opacity-50 border border-emerald-200 hover:border-emerald-300"
                          >
                            {loading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                            <span>Approve</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReject(note.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-700 font-semibold text-xs sm:text-sm rounded-lg hover:bg-red-100 transition-all disabled:opacity-50 border border-red-200 hover:border-red-300"
                          >
                            {loading ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
                            <span>Reject</span>
                          </motion.button>
                        </>
                      )}
                    </div>
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
          transition={{ duration: 0.4 }}
          className="text-center py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300"
        >
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl mb-6"
          >
            <FileText className="text-slate-500" size={40} />
          </motion.div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            No notes found
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm sm:text-base">
            {filter === 'all' 
              ? 'No trainer notes have been submitted yet' 
              : filter === 'pending'
              ? 'All pending notes have been reviewed'
              : `No ${filter} notes at this time`}
          </p>
        </motion.div>
      )}

      {/* Note Detail Modal */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            onClick={() => setSelectedNote(null)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
              style={{
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }} />
              
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 break-words" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {selectedNote.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" />
                        <span className="font-medium">{selectedNote.trainerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{selectedNote.createdAt ? new Date(selectedNote.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(() => {
                      const badge = getStatusBadge(selectedNote.status)
                      return (
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${badge.bg}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </motion.div>
                      )
                    })()}
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedNote(null)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                      <X size={20} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-slate-200/60 max-h-96 overflow-y-auto"
                >
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base">{selectedNote.content}</p>
                </motion.div>

                {/* Actions */}
                <div className="flex gap-3 sm:gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedNote(null)}
                    className="flex-1 px-4 py-3.5 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    Close
                  </motion.button>

                  {selectedNote.status?.toUpperCase() === 'PENDING' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleReject(selectedNote.id)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-red-50 text-red-700 font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-all border border-red-200 hover:border-red-300"
                      >
                        {loading ? <Loader size={16} className="animate-spin" /> : <X size={16} />}
                        Reject
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApprove(selectedNote.id)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl disabled:from-slate-400 disabled:to-slate-400 transition-all shadow-lg disabled:shadow-none"
                      >
                        {loading ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                        Approve
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default AdminNoteApproval
