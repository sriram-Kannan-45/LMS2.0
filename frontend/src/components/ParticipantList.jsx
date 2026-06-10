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
      <div className="empty-state" role="status" aria-live="polite">
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No Participants Yet</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Participants will appear here once they register.</p>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="btn btn-primary btn-sm"
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
          <Search className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <input
            id="participant-search"
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            style={{
              width: '100%', padding: '8px 14px 8px 36px', fontSize: 13, height: 38,
              fontFamily: 'inherit', background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-default)', borderRadius: 10,
              color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color 200ms ease, box-shadow 200ms ease'
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
            aria-label="Search participants by name, email, or phone"
          />
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1" style={{ background: 'var(--bg-subtle)', borderRadius: 10, padding: 3 }}>
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
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                transition: 'all 180ms ease',
                background: statusFilter === chip.key ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter === chip.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: statusFilter === chip.key ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }} role="status" aria-live="polite" aria-atomic="true">
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
                  <div style={{
                    width: 28, height: 28, borderRadius: 9999,
                    background: 'var(--accent-light)', color: 'var(--accent-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                    flexShrink: 0
                  }}>
                    {getInitials(p.name)}
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name || '-'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.phone || '-'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {new Date(p.created_at || p.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  <StatusBadge status={p.status || 'PENDING'} size="sm" />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    {onView && (
                      <button
                        onClick={() => onView(p)}
                        className="btn-icon btn-sm"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingParticipant(p); setEditStatus(p.status || 'PENDING') }}
                      className="btn-icon btn-sm"
                      title="Edit Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="btn-icon btn-sm"
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
        <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }} aria-label="Pagination">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="btn btn-sm"
            aria-label="Previous page"
          >
            Previous
          </button>
          
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, padding: '0 8px' }} role="status">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="btn btn-sm"
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
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--accent-light)', color: 'var(--accent-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, fontFamily: "'Outfit', sans-serif"
                }}>
                  {getInitials(editingParticipant.name)}
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{editingParticipant.name}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{editingParticipant.email}</p>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Account Status</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEditStatus('APPROVED')}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 180ms ease',
                      background: editStatus === 'APPROVED' ? 'rgba(16,185,129,0.08)' : 'transparent',
                      color: editStatus === 'APPROVED' ? '#059669' : 'var(--text-secondary)',
                      borderColor: editStatus === 'APPROVED' ? 'rgba(16,185,129,0.3)' : 'var(--border-default)'
                    }}
                  >
                    <Check className="w-3.5 h-3.5" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('REJECTED')}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 180ms ease',
                      background: editStatus === 'REJECTED' ? 'rgba(239,68,68,0.08)' : 'transparent',
                      color: editStatus === 'REJECTED' ? '#dc2626' : 'var(--text-secondary)',
                      borderColor: editStatus === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'var(--border-default)'
                    }}
                  >
                    <X className="w-3.5 h-3.5" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Rejected
                  </button>
                </div>
              </div>

              <div className="modal-footer">
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
