import React from 'react'
import { Trash2, Edit, Eye } from 'lucide-react'
import StatusBadge from './StatusBadge'

function ParticipantCard({ 
  type = 'participant',
  name = '',
  email = '',
  phone = '',
  status = 'PENDING',
  date = '',
  avatar = '',
  onView = null,
  onEdit = null,
  onDelete = null,
  metadata = {}
}) {
  const getInitials = (fullName) => {
    if (!fullName) return '?'
    return fullName
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {avatar || getInitials(name)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">{name || '-'}</h3>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4 pb-4 border-b">
        {phone && <p className="text-gray-600"><span className="font-medium">Phone:</span> {phone}</p>}
        {date && <p className="text-gray-600"><span className="font-medium">Date:</span> {formatDate(date)}</p>}
      </div>

      <div className="flex gap-2 justify-end">
        {onView && (
          <button onClick={onView} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" aria-label="View details">
            <Eye className="w-4 h-4" />
          </button>
        )}
        {onEdit && (
          <button onClick={onEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" aria-label="Edit">
            <Edit className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" aria-label="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default ParticipantCard
