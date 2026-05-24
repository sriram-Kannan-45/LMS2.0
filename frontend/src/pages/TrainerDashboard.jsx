import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Users, Star, Upload, FileText, CheckCircle, XCircle, Clock, MessageSquare, TrendingUp } from 'lucide-react'
import TrainerForm from '../components/TrainerForm'
import TrainerAIQuiz from '../components/TrainerAIQuiz'
import { useToast } from '../components/Toast'
import Pagination from '../components/Pagination'
import SortableTableHeader from '../components/SortableTableHeader'

import { API_BASE } from '../api/api'

const API = API_BASE

function TrainerDashboard({ user, onLogout, activeTab, onTabChange }) {
  const { success, error: showError, info } = useToast()
  const [tab, setTab] = useState(activeTab || 'trainings')

  useEffect(() => {
    if (activeTab) setTab(activeTab)
  }, [activeTab])

  const handleTabChange = (newTab) => {
    setTab(newTab)
    if (onTabChange) onTabChange(newTab)
  }
  const [trainings, setTrainings] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [stats, setStats] = useState({ totalTrainings: 0, avgTrainerRating: 0, avgSubjectRating: 0, totalFeedbacks: 0 })
  const [feedbackSort, setFeedbackSort] = useState({ key: '', direction: 'asc' })
  const [feedbackPage, setFeedbackPage] = useState(1)
  const feedbackItemsPerPage = 5

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    fetchTrainings()
    fetchFeedbacks()
    fetchTrainingsList()
    fetchNotes()
  }, [])

  const fetchTrainings = async () => {
    try {
      const r = await fetch(`${API}/trainer/trainings`, { headers: auth() })
      const d = await r.json()
      const list = d.trainings || []
      setTrainings(list)
      setStats(p => ({ ...p, totalTrainings: list.length }))
    } catch {}
  }

  const fetchFeedbacks = async () => {
    try {
      const r = await fetch(`${API}/trainer/feedbacks`, { headers: auth() })
      const d = await r.json()
      const list = d.feedbacks || []
      setFeedbacks(list)
      setStats(p => ({
        ...p,
        avgTrainerRating: d.averageTrainerRating || 0,
        avgSubjectRating: d.averageSubjectRating || 0,
        totalFeedbacks: list.length
      }))
    } catch {}
  }

  const handleReply = async (e) => {
    e.preventDefault()
    try {
      const r = await fetch(`${API}/feedback/${replyModal.id}/reply`, {
        method: 'POST', headers: auth(), body: JSON.stringify({ trainerResponse: replyText })
      })
      const d = await r.json().catch(() => ({}))
      console.log("STATUS:", r.status);
      console.log("DATA:", d);

      if (!r.ok || d.success === false) {
        showError(d.error || d.message || 'Failed to save reply')
        return
      }

      success('Reply submitted successfully!')
      setReplyModal(null)
      setReplyText('')
      fetchFeedbacks()
    } catch (e) {
      showError(e.message)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'
  const Stars = ({ v }) => <span className="stars">{[1,2,3,4,5].map(s => <span key={s} className={`star ${s<=v?'filled':''}`}>&#9733;</span>)}</span>
  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'TR'

  // Sort feedbacks
  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    if (!feedbackSort.key) return 0
    const aVal = a[feedbackSort.key] ?? ''
    const bVal = b[feedbackSort.key] ?? ''
    const comparison = String(aVal).localeCompare(String(bVal))
    return feedbackSort.direction === 'asc' ? comparison : -comparison
  })

  // Paginate feedbacks
  const paginatedFeedbacks = sortedFeedbacks.slice(
    (feedbackPage - 1) * feedbackItemsPerPage,
    feedbackPage * feedbackItemsPerPage
  )
  const totalFeedbackPages = Math.ceil(sortedFeedbacks.length / feedbackItemsPerPage)

  const handleFeedbackSort = (key) => {
    setFeedbackSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const TABS = [
    { key: 'trainings', label: 'My Trainings' },
    { key: 'notes', label: 'Upload Notes' },
    { key: 'ai-quiz', label: 'AI Quiz Generator' },
    { key: 'feedback', label: 'Feedback Received' },
    { key: 'profile', label: 'My Profile' },
  ]

  const [noteForm, setNoteForm] = useState({ title: '', description: '', link: '', trainingId: '' })
  const [noteFile, setNoteFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState([])
  const [trainingsList, setTrainingsList] = useState([])


  const handleUploadNote = async (e) => {
    e.preventDefault()
    if (!noteForm.title || (!noteFile && !noteForm.link)) {
      showError('Title and file or link required')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', noteForm.title)
      formData.append('description', noteForm.description)
      formData.append('link', noteForm.link)
      formData.append('trainingId', noteForm.trainingId)
      if (noteFile) formData.append('file', noteFile)

      const r = await fetch(`${API}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      success('Note uploaded! Waiting for admin approval.')
      setNoteForm({ title: '', description: '', link: '', trainingId: '' })
      setNoteFile(null)
      fetchNotes()
    } catch (e) { showError(e.message) }
    finally { setUploading(false) }
  }

  const fetchNotes = async () => {
    try {
      const r = await fetch(`${API}/notes/my-notes`, { headers: auth() })
      const d = await r.json()
      setNotes(d.notes || [])
    } catch {}
  }

  const fetchTrainingsList = async () => {
    try {
      const r = await fetch(`${API}/trainer/trainings`, { headers: auth() })
      const d = await r.json()
      setTrainingsList(d.trainings || [])
    } catch {}
  }

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Assigned Trainings</div>
          <div className="stat-value">{stats.totalTrainings}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Feedback Responses</div>
          <div className="stat-value">{stats.totalFeedbacks}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Avg Trainer Rating</div>
          <div className="stat-value">{stats.avgTrainerRating}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Avg Subject Rating</div>
          <div className="stat-value">{stats.avgSubjectRating}</div>
        </div>
      </div>

      <div className="tabs-pills">
        {TABS.map(t => (
          <button key={t.key} className={`tab-pill ${tab === t.key ? 'active' : ''}`} onClick={() => handleTabChange(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'trainings' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="section-header">
            <h3>Assigned Training Programs</h3>
          </div>
          {trainings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No Trainings Assigned</h3>
                <p>You haven't been assigned to any training programs yet.</p>
              </div>
            </div>
          ) : (
            <div className="training-grid">
              {trainings.map(t => {
                const pct = t.capacity ? Math.round((t.enrolledCount / t.capacity) * 100) : null
                return (
                  <motion.div 
                    key={t.id} 
                    className="training-card card-hover-lift"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="training-card-title">{t.title}</div>
                    <div className="training-card-desc">{t.description || 'No description provided.'}</div>
                    <div className="training-meta">
                      <div className="meta-item">
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="meta-key">Dates:</span>
                        <span>{fmtDate(t.startDate)} - {fmtDate(t.endDate)}</span>
                      </div>
                      <div className="meta-item">
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="meta-key">Enrolled:</span>
                        <span>{t.enrolledCount} {t.capacity ? `/ ${t.capacity}` : ''}</span>
                      </div>
                    </div>
                    {pct !== null && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          <span>Capacity Fill</span>
                          <span style={{ fontWeight: 600 }}>{pct}%</span>
                        </div>
                        <div className="progress-bar progress-bar-animated">
                          <motion.div 
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {tab === 'feedback' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card">
            <div className="card-header">
              <h3>Feedback Received ({feedbacks.length})</h3>
            </div>
            {feedbacks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No Feedback Yet</h3>
                <p>Feedback from participants will appear here once they start submitting.</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <SortableTableHeader sortKey="trainingTitle" currentSort={feedbackSort.key} sortDirection={feedbackSort.direction} onSort={handleFeedbackSort}>Training</SortableTableHeader>
                        <th>Participant</th>
                        <SortableTableHeader sortKey="trainerRating" currentSort={feedbackSort.key} sortDirection={feedbackSort.direction} onSort={handleFeedbackSort} numeric>Trainer Rating</SortableTableHeader>
                        <SortableTableHeader sortKey="subjectRating" currentSort={feedbackSort.key} sortDirection={feedbackSort.direction} onSort={handleFeedbackSort} numeric>Subject Rating</SortableTableHeader>
                        <th>Comments</th>
                        <th>My Reply</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFeedbacks.map(f => (
                        <tr key={f.id}>
                          <td><strong>{f.trainingTitle}</strong></td>
                          <td>{f.anonymous ? <span className="badge badge-gray">Anonymous</span> : f.participantName}</td>
                          <td><Stars v={f.trainerRating} /></td>
                          <td><Stars v={f.subjectRating} /></td>
                          <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-secondary)' }}>{f.comments || '-'}</td>
                          <td style={{ maxWidth: 200, fontSize: 12 }}>
                            {f.trainerResponse ? (
                              <span style={{ color: 'var(--text-secondary)' }}>{f.trainerResponse}</span>
                            ) : (
                              <button className="btn btn-sm btn-primary" onClick={() => { setReplyModal(f); setReplyText(''); }}>
                                <MessageSquare size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Reply
                              </button>
                            )}
                          </td>
                          <td>{fmtDate(f.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalFeedbackPages > 1 && (
                  <Pagination
                    currentPage={feedbackPage}
                    totalPages={totalFeedbackPages}
                    onPageChange={setFeedbackPage}
                  />
                )}
              </>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'notes' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
        >
          <div className="card">
            <div className="card-header">
              <h3><Upload size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Upload Note</h3>
            </div>
            <form onSubmit={handleUploadNote}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-control" type="text" value={noteForm.title}
                  onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))} required placeholder="Enter note title" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={noteForm.description}
                  onChange={e => setNoteForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description..." rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Related Training (optional)</label>
                <select className="form-control" value={noteForm.trainingId}
                  onChange={e => setNoteForm(p => ({ ...p, trainingId: e.target.value }))}>
                  <option value="">Select training</option>
                  {trainingsList.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">File OR Link</label>
                <input type="file" onChange={e => setNoteFile(e.target.files[0])} className="form-control" />
                <div style={{ margin: '8px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>OR</div>
                <input className="form-control" type="url" placeholder="https://example.com/resource"
                  value={noteForm.link} onChange={e => { setNoteForm(p => ({ ...p, link: e.target.value })); setNoteFile(null) }} />
              </div>
              <motion.button 
                type="submit" 
                className="btn btn-primary btn-full" 
                disabled={uploading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {uploading ? 'Uploading...' : <><Upload size={16} style={{ marginRight: 6 }} /> Upload Note</>}
              </motion.button>
            </form>
          </div>
          <div className="card">
            <div className="card-header">
              <h3><FileText size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> My Notes ({notes.length})</h3>
            </div>
            {notes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>No Notes Yet</h3>
                <p>Upload notes to share with participants.</p>
              </div>
            ) : (
              <div className="notes-list">
                {notes.map(n => {
                  const statusColors = {
                    PENDING: 'badge-yellow',
                    APPROVED: 'badge-green',
                    REJECTED: 'badge-red'
                  }
                  return (
                    <div key={n.id} className="note-card">
                      <div className="note-title">{n.title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                        <span className={`badge ${n.fileType ? 'badge-blue' : 'badge-gray'}`}>{n.fileType || 'Link'}</span>
                        <span className={`badge ${statusColors[n.status] || 'badge-gray'}`}>{n.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'ai-quiz' && (
        <TrainerAIQuiz user={user} />
      )}

      {tab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card">
            <div className="card-header">
              <h3>My Profile</h3>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Manage your trainer profile & photo</span>
            </div>
            <TrainerForm user={user} />
          </div>
        </motion.div>
      )}

      {replyModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Reply to Feedback</h3>
              <button className="modal-close" onClick={() => setReplyModal(null)}>&#10005;</button>
            </div>
            <form onSubmit={handleReply}>
              <div className="form-group">
                <label className="form-label">Your Response</label>
                <textarea className="form-control" value={replyText} required onChange={e => setReplyText(e.target.value)} placeholder="Type your response..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setReplyModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Reply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainerDashboard