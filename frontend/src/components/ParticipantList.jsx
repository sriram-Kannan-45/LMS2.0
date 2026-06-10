import React, { useState, useMemo, useCallback, memo } from 'react'
import { Search, Trash2, Eye, Phone, Calendar, Edit2, Check, X, ShieldAlert } from 'lucide-react'
import StatusBadge from './StatusBadge'
import SkeletonCard from './SkeletonCard'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ParticipantList Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert">
          <h3 className="font-semibold mb-1">Error Loading Participants</h3>
          <p className="text-sm">{this.state.error?.message || 'An unexpected error occurred'}</p>
        </div>
      )
    }
    return this.props.children
  }
}

function ParticipantList({ 
  participants = [], 
  loading = false, 
  onDelete = null, 
  onRefresh = null, 
  onView = null,
  onApprove = null,
  onReject = null 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const itemsPerPage = 10

  const getInitials = useCallback((name) => {
    if (!name) return '?'
    return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }, [])

  const counts = useMemo(() => {
    const res = { all: participants.length, APPROVED: 0, PENDING: 0, REJECTED: 0 }
    participants.forEach(p => {
      const status = (p.status || '').toUpperCase()
      if (status === 'APPROVED') res.APPROVED++
      if (status === 'PENDING') res.PENDING++
      if (status === 'REJECTED') res.REJECTED++
    })
    return res
  }, [participants])

  const filteredItems = useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [participants, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredItems.slice(startIdx, startIdx + itemsPerPage)

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }, [])

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }, [totalPages])

  const handleDelete = useCallback((id, name) => {
    if (onDelete) {
      onDelete(id, name)
    }
  }, [onDelete])

  const handleSaveStatus = async () => {
    if (!editingParticipant) return
    try {
      if (editStatus === 'APPROVED' && editingParticipant.status !== 'APPROVED') {
        if (onApprove) await onApprove(editingParticipant.id)
      } else if (editStatus === 'REJECTED' && editingParticipant.status !== 'REJECTED') {
        if (onReject) await onReject(editingParticipant.id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setEditingParticipant(null)
    }
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading participants">
        <SkeletonCard variant="card" count={5} />
      </div>
    )
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="text-center py-10" role="status" aria-live="polite">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">No Participants Yet</h3>
        <p className="text-sm text-slate-500 mb-4">Participants will appear here once they register.</p>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition cursor-pointer text-sm font-semibold"
            aria-label="Refresh participant list"
          >
            Refresh List
          </button>
        )}
      </div>
    )
  }

  const resultsMessage = `Showing ${paginatedItems.length} of ${filteredItems.length} participants`

  return (
    <div className="space-y-4">
      {/* Toolbar: Search box & Segmented Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="participant-search" className="sr-only">Search participants</label>
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <input
            id="participant-search"
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-200 text-sm"
            aria-label="Search participants by name, email, or phone"
          />
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'APPROVED', label: 'Approved', count: counts.APPROVED },
            { key: 'PENDING', label: 'Pending', count: counts.PENDING },
            { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED }
          ].map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => { setStatusFilter(chip.key); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === chip.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
      </div>

      <div 
        id="search-results" 
        className="text-xs text-slate-500 dark:text-slate-400 font-semibold pl-1 pb-1"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {resultsMessage}
      </div>

      {/* Participant Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Registration Date</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {getInitials(p.name)}
                  </div>
                </td>
                <td className="font-medium text-slate-800">{p.name || '-'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.phone || '-'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {new Date(p.created_at || p.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  <StatusBadge status={p.status || 'PENDING'} size="sm" />
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    {onView && (
                      <button
                        onClick={() => onView(p)}
                        className="p-1.5 text-slate-400 hover:text-violet-600 rounded transition-all cursor-pointer"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingParticipant(p); setEditStatus(p.status || 'PENDING') }}
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded transition-all cursor-pointer"
                      title="Edit Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-all cursor-pointer"
                        title="Remove Participant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
        {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-2 mt-6" aria-label="Pagination">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition cursor-pointer font-medium text-slate-600"
            aria-label="Previous page"
          >
            Previous
          </button>
          
          <div className="text-xs text-slate-500 font-medium px-2" role="status">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition cursor-pointer font-medium text-slate-600"
            aria-label="Next page"
          >
            Next
          </button>
        </nav>
      )}

      {/* Edit Status Modal */}
      {editingParticipant && (
        <div className="modal-overlay" onClick={() => setEditingParticipant(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Manage Participant Status</h3>
              <button className="modal-close" onClick={() => setEditingParticipant(null)}>×</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-semibold text-sm">
                  {getInitials(editingParticipant.name)}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{editingParticipant.name}</h4>
                  <p className="text-xs text-slate-400">{editingParticipant.email}</p>
                </div>
              </div>

              <div className="form-group mt-4">
                <label className="form-label">Account Status</label>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('APPROVED')}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      editStatus === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 inline mr-1" /> Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('REJECTED')}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      editStatus === 'REJECTED'
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-3.5 h-3.5 inline mr-1" /> Rejected
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button type="button" className="btn btn-sm" onClick={() => setEditingParticipant(null)}>Cancel</button>
                <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveStatus}>Save Status</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ParticipantList)
