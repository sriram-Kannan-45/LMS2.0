import { Search, ChevronUp, ChevronDown, Trash2, Eye, Phone, Calendar } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-xl font-bold text-slate-900 sr-only">Participant Management</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <label htmlFor="participant-search" className="sr-only">Search participants</label>
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <input
              id="participant-search"
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-200 text-sm shadow-sm"
              aria-label="Search participants by name, email, or phone"
              aria-describedby="search-results"
            />
          </div>
          
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-4 py-2.5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-200 text-sm shadow-sm cursor-pointer"
            aria-label="Filter participants by status"
          >
            <option value="all">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        
        <div 
          id="search-results" 
          className="text-xs text-slate-500 dark:text-slate-400 font-medium pl-1 mt-1"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {resultsMessage}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
        {paginatedItems.map((p, i) => (
          <article 
            key={p.id} 
            className="bg-white dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
            role="listitem"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-950/40 flex items-center justify-center text-sm font-bold transition-transform duration-300 group-hover:scale-105"
                    aria-label={`Avatar for ${p.name || 'Unknown participant'}`}
                  >
                    {getInitials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-200">{p.name || '-'}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{p.email}</p>
                  </div>
                </div>
                <StatusBadge status={p.status || 'PENDING'} size="sm" />
              </div>
              
              <dl className="text-xs text-slate-600 dark:text-slate-400 space-y-2 my-4 py-4 border-t border-b border-slate-100 dark:border-slate-800/60">
                {p.phone && (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Phone:</dt>
                    <dd className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      <span>{p.phone}</span>
                    </dd>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Joined Date:</dt>
                  <dd className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    <span>Joined {new Date(p.created_at || p.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </dd>
                </div>
              </dl>
            </div>

            {(onView || onDelete) && (
              <div className="flex gap-2 mt-2 pt-1">
                {onView && (
                  <button
                    onClick={() => onView(p)}
                    className="flex-1 px-3 py-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 cursor-pointer"
                    aria-label={`View profile for ${p.name}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600" aria-hidden="true" /> View profile
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all duration-200 text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 cursor-pointer"
                    aria-label={`Remove participant ${p.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remove
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-2 mt-8" aria-label="Pagination">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-200 cursor-pointer"
            aria-label="Previous page"
            aria-disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-3" role="status" aria-live="polite">
            Page <span aria-current={currentPage === 1 ? 'page' : undefined}>{currentPage}</span> of {totalPages}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-200 cursor-pointer"
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
