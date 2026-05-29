import React, { useState, useMemo, useCallback, memo } from 'react'
import { Search, ChevronUp, ChevronDown, Trash2, Eye } from 'lucide-react'
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

function ParticipantList({ participants = [], loading = false, onDelete = null, onRefresh = null, onView = null }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const getInitials = useCallback((name) => {
    if (!name) return '?'
    return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }, [])

  const filteredAndSorted = useMemo(() => {
    let filtered = participants.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aVal = a[sortBy] || ''
      let bVal = b[sortBy] || ''
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [participants, searchTerm, statusFilter, sortBy, sortOrder])

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredAndSorted.slice(startIdx, startIdx + itemsPerPage)

  const handleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }, [sortBy, sortOrder])

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }, [])

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value)
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

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading participants">
        <SkeletonCard variant="card" count={5} />
      </div>
    )
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200" role="status" aria-live="polite">
        <div className="text-4xl mb-3" aria-hidden="true">👥</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">No Participants Yet</h3>
        <p className="text-gray-600 mb-4">Participants will appear here once they register.</p>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Refresh participant list"
          >
            Refresh List
          </button>
        )}
      </div>
    )
  }

  const resultsMessage = `Showing ${paginatedItems.length} of ${filteredAndSorted.length} participants`

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 mb-4">
        <h2 className="text-xl font-bold text-gray-900 sr-only">Participant Management</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <label htmlFor="participant-search" className="sr-only">Search participants</label>
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              id="participant-search"
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Search participants by name, email, or phone"
              aria-describedby="search-results"
            />
          </div>
          
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Filter participants by status"
          >
            <option value="all">All Status</option>
            <option value="APPROVED">✓ Approved</option>
            <option value="PENDING">⏳ Pending</option>
            <option value="REJECTED">✕ Rejected</option>
          </select>
        </div>
        
        <div 
          id="search-results" 
          className="text-sm text-gray-600"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {resultsMessage}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
        {paginatedItems.map((p, i) => (
          <article 
            key={p.id} 
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition focus-within:ring-2 focus-within:ring-blue-500"
            role="listitem"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold"
                  aria-label={`Avatar for ${p.name || 'Unknown participant'}`}
                >
                  {getInitials(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{p.name || '-'}</h3>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                </div>
              </div>
              <StatusBadge status={p.status || 'PENDING'} size="sm" />
            </div>
            
            <dl className="text-sm text-gray-600 space-y-1 mb-3 pb-3 border-b">
              {p.phone && (
                <div>
                  <dt className="sr-only">Phone:</dt>
                  <dd><span className="font-medium" aria-hidden="true">📞</span> {p.phone}</dd>
                </div>
              )}
              <div>
                <dt className="sr-only">Joined Date:</dt>
                <dd><span className="font-medium" aria-hidden="true">📅</span> {new Date(p.created_at || p.joinedAt).toLocaleDateString('en-IN')}</dd>
              </div>
            </dl>

            {(onView || onDelete) && (
              <div style={{ display: 'flex', gap: 8 }}>
                {onView && (
                  <button
                    onClick={() => onView(p)}
                    className="flex-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`View profile for ${p.name}`}
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" /> View profile
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="flex-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label={`Remove participant ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Remove
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-2 mt-6" aria-label="Pagination">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Previous page"
            aria-disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="text-sm text-gray-600" role="status" aria-live="polite">
            Page <span aria-current={currentPage === 1 ? 'page' : undefined}>{currentPage}</span> of {totalPages}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Next page"
            aria-disabled={currentPage === totalPages}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  )
}

export default memo(ParticipantList)
