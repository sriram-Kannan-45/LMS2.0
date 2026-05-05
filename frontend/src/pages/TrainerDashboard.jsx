import { useState, useEffect } from 'react'
import TrainerForm from '../components/TrainerForm'
import TrainerAIQuiz from '../components/TrainerAIQuiz'

import { API_BASE } from '../api/api'

const API = API_BASE

function TrainerDashboard({ user, onLogout, activeTab, onTabChange }) {
  const [tab, setTab] = useState(activeTab || 'trainings')
  const handleTabChange = (newTab) => {
    setTab(newTab)
    if (onTabChange) onTabChange(newTab)
  }
  const [trainings, setTrainings] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [stats, setStats] = useState({ totalTrainings: 0, avgTrainerRating: 0, avgSubjectRating: 0, totalFeedbacks: 0 })

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyErr, setReplyErr] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

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
    setReplyErr('')
    try {
      const r = await fetch(`${API}/feedback/${replyModal.id}/reply`, {
        method: 'POST', headers: auth(), body: JSON.stringify({ trainerResponse: replyText })
      })
      const d = await r.json().catch(() => ({}))
      console.log("STATUS:", r.status);
      console.log("DATA:", d);

      if (!r.ok || d.success === false) {
        setReplyErr(d.error || d.message || 'Failed to save reply')
        return
      }

      setReplyModal(null)
      setReplyText('')
      fetchFeedbacks()
    } catch (e) {
      setReplyErr(e.message)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'
  const Stars = ({ v }) => <span className="stars">{[1,2,3,4,5].map(s => <span key={s} className={`star ${s<=v?'filled':''}`}>&#9733;</span>)}</span>
  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'TR'

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
      setErr('Title and file or link required')
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
      setMsg('Note uploaded! Waiting for admin approval.')
      setNoteForm({ title: '', description: '', link: '', trainingId: '' })
      setNoteFile(null)
      fetchNotes()
    } catch (e) { setErr(e.message) }
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

          <div className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => handleTabChange(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'trainings' && (
            <div>
              <div className="section-header">
                <h3>Assigned Training Programs</h3>
              </div>
              {trainings.length === 0 ? (
                <div className="card"><div className="empty-state"><p>No trainings assigned to you yet.</p></div></div>
              ) : (
                <div className="training-grid">
                  {trainings.map(t => {
                    const pct = t.capacity ? Math.round((t.enrolledCount / t.capacity) * 100) : null
                    return (
                      <div key={t.id} className="training-card">
                        <div className="training-card-title">{t.title}</div>
                        <div className="training-card-desc">{t.description || 'No description provided.'}</div>
                        <div className="training-meta">
                          <div className="meta-item"><span className="meta-key">Dates:</span><span>{fmtDate(t.startDate)} - {fmtDate(t.endDate)}</span></div>
                          <div className="meta-item"><span className="meta-key">Enrolled:</span><span>{t.enrolledCount} {t.capacity ? `/ ${t.capacity}` : ''}</span></div>
                        </div>
                        {pct !== null && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                              <span>Capacity Fill</span><span>{pct}%</span>
                            </div>
                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'feedback' && (
            <div className="card">
              <div className="card-header">
                <h3>Feedback Received ({feedbacks.length})</h3>
              </div>
              {feedbacks.length === 0 ? (
                <div className="empty-state"><p>No feedback received yet.</p></div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Training</th><th>Participant</th><th>Trainer Rating</th><th>Subject Rating</th><th>Comments</th><th>My Reply</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {feedbacks.map(f => (
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
                              <button className="btn btn-sm" onClick={() => { setReplyModal(f); setReplyText(''); setReplyErr(''); }}>Reply</button>
                            )}
                          </td>
                          <td>{fmtDate(f.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="card">
                <div className="card-header">
                  <h3>Upload Note</h3>
                </div>
                {err && <div className="error">{err}</div>}
                {msg && <div className="success">{msg}</div>}
                <form onSubmit={handleUploadNote}>
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-control" type="text" value={noteForm.title}
                      onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" value={noteForm.description}
                      onChange={e => setNoteForm(p => ({ ...p, description: e.target.value }))} />
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
                    <div style={{ margin: '8px 0', textAlign: 'center' }}>OR</div>
                    <input className="form-control" type="url" placeholder="https://example.com/resource"
                      value={noteForm.link} onChange={e => { setNoteForm(p => ({ ...p, link: e.target.value })); setNoteFile(null) }} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Note'}
                  </button>
                </form>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3>My Notes ({notes.length})</h3>
                </div>
                {notes.length === 0 ? (
                  <div className="empty-state"><p>No notes uploaded yet.</p></div>
                ) : (
                  <div className="notes-list">
                    {notes.map(n => (
                      <div key={n.id} className="note-card">
                        <div className="note-title">{n.title}</div>
                        <div className="note-type badge badge-blue">{n.fileType}</div>
                        <div className="note-status badge badge-gray">{n.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'ai-quiz' && (
            <TrainerAIQuiz user={user} />
          )}

           {tab === 'profile' && (
             <div className="card">
               <div className="card-header">
                 <h3>My Profile</h3>
                 <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Manage your trainer profile &amp; photo</span>
               </div>
               <TrainerForm user={user} />
             </div>
           )}

           {replyModal && (
             <div className="modal-overlay">
               <div className="modal">
                 <div className="modal-header">
                   <h3>Reply to Feedback</h3>
                   <button className="modal-close" onClick={() => setReplyModal(null)}>&#10005;</button>
                 </div>
                 <form onSubmit={handleReply}>
                   {replyErr && <div className="error" style={{ marginBottom: 12 }}>{replyErr}</div>}
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