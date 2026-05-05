import { useEffect } from 'react'

/**
 * ParticipantList — displays participants with empty state
 */
function ParticipantList({ participants, loading, onDelete, onRefresh }) {
  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <p>Loading participants...</p>
      </div>
    )
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👥</div>
        <h3>No Participants Yet</h3>
        <p>Participants will appear here once they register.</p>
        <button 
          className="btn btn-primary" 
          style={{ marginTop: 16 }}
          onClick={onRefresh}
        >
          Refresh List
        </button>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Registered On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p, i) => (
            <tr key={p.id}>
              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div 
                    className="user-avatar" 
                    style={{ width: 28, height: 28, fontSize: 11 }}
                  >
                    {p.name ? p.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                  </div>
                  {p.name || '-'}
                </div>
              </td>
              <td>{p.email}</td>
              <td>{p.phone || '-'}</td>
              <td>
                <span className={`badge ${p.status === 'APPROVED' ? 'badge-green' : p.status === 'PENDING' ? 'badge-yellow' : 'badge-gray'}`}>
                  {p.status || 'UNKNOWN'}
                </span>
              </td>
              <td>{new Date(p.created_at || p.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td>
                <button 
                  className="btn btn-sm btn-danger" 
                  onClick={() => onDelete && onDelete(p.id, p.name)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ParticipantList
