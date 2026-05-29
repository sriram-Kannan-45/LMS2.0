import React from 'react'

function StatusBadge({ status, size = 'md', variant = 'default' }) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const statusConfig = {
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✓' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '⏳' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '✕' },
    ACTIVE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: '●' },
    INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', icon: '○' }
  }

  const config = statusConfig[status] || statusConfig.PENDING
  const sizeClass = sizeClasses[size] || sizeClasses.md

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClass} transition-all duration-200`}
      role="status"
      aria-label={`Status: ${status}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{status}</span>
    </span>
  )
}

export default StatusBadge
