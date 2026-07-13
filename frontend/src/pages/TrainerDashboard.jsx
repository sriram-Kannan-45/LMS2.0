import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Users, Star, FileText, CheckCircle, XCircle, Clock, MessageSquare, TrendingUp, Monitor, Shield } from 'lucide-react'
import TrainerForm from '../components/TrainerForm'
import NotesSection from '../components/trainer/notes/NotesSection'
import ParticipantProfileView from '../components/shared/ParticipantProfileView'
import TrainerCourses from './TrainerCourses'
import { useToast } from '../components/Toast'
import Pagination from '../components/Pagination'
import SortableTableHeader from '../components/SortableTableHeader'
import { Button, Badge, Table, PageHeader, EmptyState, StatCard, ProgressBar } from '../components/ui'

import { API_BASE } from '../api/api'

const API = API_BASE

function TrainerDashboard({ user, onLogout, activeTab, onTabChange }) {
  const navigate = useNavigate()
  const { success, error: showError, info } = useToast()
  const tab = activeTab === 'trainings' ? 'courses' : (activeTab || 'courses')
  const [trainings, setTrainings] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [stats, setStats] = useState({ totalTrainings: 0, avgTrainerRating: 0, avgSubjectRating: 0, totalFeedbacks: 0 })
  const [feedbackSort, setFeedbackSort] = useState({ key: '', direction: 'asc' })
  const [feedbackPage, setFeedbackPage] = useState(1)
  const feedbackItemsPerPage = 5

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [viewingParticipant, setViewingParticipant] = useState(null)
  const [enrollmentRequests, setEnrollmentRequests] = useState([])
  const [trainerReport, setTrainerReport] = useState(null)

  const fetchEnrollmentRequests = async () => {
    try {
      const r = await fetch(`${API}/trainer/enrollment-requests`, { headers: auth() })
      const d = await r.json()
      if (r.ok && d.success) {
        setEnrollmentRequests(d.pendingRequests || [])
      }
    } catch (e) {
      console.error('fetchEnrollmentRequests error:', e.message)
    }
  }

  const fetchTrainerReport = async () => {
    try {
      const r = await fetch(`${API}/reports/trainer`, { headers: auth() })
      const d = await r.json()
      if (r.ok && d.success) {
        setTrainerReport(d.data)
      }
    } catch (e) {
      console.error('fetchTrainerReport error:', e.message)
    }
  }

  const handleApproveEnrollment = async (requestId) => {
    try {
      const r = await fetch(`${API}/trainer/enrollment-requests/${requestId}/approve`, {
        method: 'POST',
        headers: auth()
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      success('Enrollment request approved successfully!')
      fetchEnrollmentRequests()
    } catch (e) {
      showError(e.message)
    }
  }

  const handleRejectEnrollment = async (requestId) => {
    try {
      const r = await fetch(`${API}/trainer/enrollment-requests/${requestId}/reject`, {
        method: 'POST',
        headers: auth()
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      success('Enrollment request rejected.')
      fetchEnrollmentRequests()
    } catch (e) {
      showError(e.message)
    }
  }

  const handleRegenerateCertificate = async () => {
    try {
      const r = await fetch(`${API}/trainer/certificates/regenerate`, {
        method: 'POST',
        headers: auth()
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      success('Certificate check/regeneration triggered successfully!')
      fetchTrainerReport()
    } catch (e) {
      showError(e.message)
    }
  }

  useEffect(() => {
    if (tab === 'enrollments') {
      fetchEnrollmentRequests()
    } else if (tab === 'reports') {
      fetchTrainerReport()
    }
  }, [tab])

  useEffect(() => {
    fetchTrainings()
    fetchFeedbacks()
  }, [])

  const fetchTrainings = async () => {
    try {
      const r = await fetch(`${API}/trainer/trainings`, { headers: auth() })
      const d = await r.json()
      console.log('DEBUG - API Response (/trainer/trainings):', d)
      const list = d.trainings || []
      setTrainings(list)
      setStats(p => ({ ...p, totalTrainings: list.length }))
    } catch (e) {
      console.error('DEBUG - fetchTrainings error:', e.message)
    }
  }

  const fetchFeedbacks = async () => {
    try {
      const r = await fetch(`${API}/trainer/feedbacks`, { headers: auth() })
      const d = await r.json()
      console.log('DEBUG - API Response (/trainer/feedbacks):', d)
      const list = d.feedbacks || []
      setFeedbacks(list)
      setStats(p => ({
        ...p,
        avgTrainerRating: d.averageTrainerRating || 0,
        avgSubjectRating: d.averageSubjectRating || 0,
        totalFeedbacks: list.length
      }))
    } catch (e) {
      console.error('DEBUG - fetchFeedbacks error:', e.message)
    }
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
        <div className="stat-card blue">
          <div className="stat-label">Avg Trainer Rating</div>
          <div className="stat-value">{stats.avgTrainerRating}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Avg Subject Rating</div>
          <div className="stat-value">{stats.avgSubjectRating}</div>
        </div>
      </div>

      {tab === 'courses' && (
        <TrainerCourses user={user} />
      )}

      {tab === 'feedback' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PageHeader
            title="Feedback Received"
            subtitle="View ratings and comments submitted by training participants."
          />
          {feedbacks.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No Feedback Yet"
              description="Feedback from participants will appear here once they start submitting."
            />
          ) : (
            <div className="space-y-4">
              <Table
                columns={[
                  {
                    key: 'trainingTitle',
                    header: (
                      <SortableTableHeader sortKey="trainingTitle" currentSort={feedbackSort.key} sortDirection={feedbackSort.direction} onSort={handleFeedbackSort}>
                        Training
                      </SortableTableHeader>
                    ),
                    render: (row) => <strong className="text-slate-800 dark:text-slate-200">{row.trainingTitle}</strong>
                  },
                  {
                    key: 'participant',
                    header: 'Participant',
                    render: (row) => row.anonymous ? <Badge color="neutral">Anonymous</Badge> : (
                      row.participantId ? (
                        <button
                          type="button"
                          onClick={() => setViewingParticipant({ id: row.participantId, name: row.participantName })}
                          className="text-violet-600 hover:text-violet-700 hover:underline text-sm font-medium focus:outline-none cursor-pointer"
                          title="View profile"
                        >
                          {row.participantName}
                        </button>
                      ) : row.participantName
                    )
                  },
                  {
                    key: 'trainerRating',
                    header: (
                      <SortableTableHeader sortKey="trainerRating" currentSort={feedbackSort.key} sortDirection={feedbackSort.direction} onSort={handleFeedbackSort} numeric>
                        Trainer Rating
                      </SortableTableHeader>
                    ),
                    render: (row) => <Stars v={row.trainerRating} />
                  },
                  {
                    key: 'subjectRating',
                    header: (
                      <SortableTableHeader sortKey="subjectRating" currentSort={feedbackSort.key} sortDirection={feedbackSort.direction} onSort={handleFeedbackSort} numeric>
                        Subject Rating
                      </SortableTableHeader>
                    ),
                    render: (row) => <Stars v={row.subjectRating} />
                  },
                  {
                    key: 'comments',
                    header: 'Comments',
                    className: 'max-w-[200px] truncate text-slate-500 text-xs',
                    render: (row) => row.comments || '-'
                  },
                  {
                    key: 'trainerResponse',
                    header: 'My Reply',
                    className: 'max-w-[200px]',
                    render: (row) => row.trainerResponse ? (
                      <span className="text-slate-500 text-xs">{row.trainerResponse}</span>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => { setReplyModal(row); setReplyText(''); }}>
                        <MessageSquare size={12} className="mr-1" /> Reply
                      </Button>
                    )
                  },
                  {
                    key: 'submittedAt',
                    header: 'Date',
                    render: (row) => fmtDate(row.submittedAt)
                  }
                ]}
                data={paginatedFeedbacks}
              />
              {totalFeedbackPages > 1 && (
                <Pagination
                  currentPage={feedbackPage}
                  totalPages={totalFeedbackPages}
                  onPageChange={setFeedbackPage}
                />
              )}
            </div>
          )}
        </motion.div>
      )}

      {tab === 'notes' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <NotesSection user={user} />
        </motion.div>
      )}

      {tab === 'enrollments' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PageHeader
            title="Enrollment Requests"
            subtitle="Review and approve participant access requests to your training courses."
            action={<Button size="sm" variant="secondary" onClick={fetchEnrollmentRequests}>Refresh</Button>}
          />
          {enrollmentRequests.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No pending requests"
              description="No participants are currently waiting for enrollment approval."
            />
          ) : (
            <Table
              columns={[
                {
                  key: 'participantName',
                  header: 'Participant',
                  render: (row) => (
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{row.participant?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{row.participant?.email}</div>
                    </div>
                  ),
                },
                {
                  key: 'courseTitle',
                  header: 'Target Training',
                  render: (row) => (
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      {row.course?.title || row.training?.title || 'Unknown'}
                    </div>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: () => <Badge color="success">Training</Badge>,
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500/20 text-white"
                        onClick={() => handleApproveEnrollment(row.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRejectEnrollment(row.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={enrollmentRequests}
            />
          )}
        </motion.div>
      )}

      {tab === 'reports' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
            <PageHeader
              title="Trainer Reports & Analytics"
              subtitle="View participant progress, quiz results, and review submissions."
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate('/trainer/courses')}>
                    <Monitor size={14} className="mr-1" />
                    Assessments
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleRegenerateCertificate}>Check/Issue Certificates</Button>
                  <Button size="sm" variant="primary" onClick={fetchTrainerReport}>Refresh Data</Button>
                </div>
              }
            />

          {!trainerReport ? (
            <div className="card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Loading report data...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Average Progress Rate" value={`${trainerReport.averageCompletion}%`} icon={TrendingUp} variant="violet" />
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Participant Progress</h3>
                {(!trainerReport.participantProgress || trainerReport.participantProgress.length === 0) ? (
                  <EmptyState icon={Users} title="No participants enrolled" description="No participants enrolled yet." />
                ) : (
                  <Table
                    columns={[
                      {
                        key: 'participantName',
                        header: 'Participant',
                        render: (row) => (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{row.participantName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{row.participantEmail}</div>
                          </div>
                        ),
                      },
                      { key: 'title', header: 'Training' },
                      { key: 'type', header: 'Type', render: () => <Badge color="success">Training</Badge> },
                      { key: 'lessons', header: 'Lessons Completed', render: (row) => `${row.completedLessons} / ${row.totalLessons || 0}` },
                      {
                        key: 'progress',
                        header: 'Progress',
                        render: (row) => (
                          <div className="w-36">
                            <ProgressBar value={row.progressPercent} max={100} showLabel color="violet" />
                          </div>
                        ),
                      },
                      {
                        key: 'avgQuizScore',
                        header: 'Avg Quiz Score',
                        render: (row) => <Badge color="success">{row.avgQuizScore}%</Badge>,
                      },
                    ]}
                    data={trainerReport.participantProgress}
                  />
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Pending Assessment Reviews</h3>
                {(!trainerReport.pendingReviews || trainerReport.pendingReviews.length === 0) ? (
                  <EmptyState icon={CheckCircle} title="All Submissions Graded" description="No pending reviews. All submissions graded!" />
                ) : (
                  <Table
                    columns={[
                      { key: 'participantName', header: 'Participant', className: 'font-semibold text-slate-800 dark:text-slate-200' },
                      { key: 'assessmentTitle', header: 'Assessment' },
                      { key: 'maxScore', header: 'Max Score' },
                      { key: 'date', header: 'Submitted At', render: (row) => fmtDate(row.date) },
                    ]}
                    data={trainerReport.pendingReviews}
                  />
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Recent Quiz Results</h3>
                {(!trainerReport.quizScores || trainerReport.quizScores.length === 0) ? (
                  <EmptyState icon={FileText} title="No quiz submissions" description="No quiz submissions yet." />
                ) : (
                  <Table
                    columns={[
                      { key: 'participantName', header: 'Participant', className: 'font-semibold text-slate-800 dark:text-slate-200' },
                      { key: 'quizTitle', header: 'Quiz' },
                      { key: 'score', header: 'Score', render: (row) => <Badge color="success">{row.score}%</Badge> },
                      { key: 'date', header: 'Date', render: (row) => fmtDate(row.date) },
                    ]}
                    data={trainerReport.quizScores}
                  />
                )}
              </div>

              {/* Assessment Scores */}
              <div className="card">
                <div className="card-header">
                  <h3>Graded Assessments</h3>
                </div>
                {(!trainerReport.assessmentScores || trainerReport.assessmentScores.length === 0) ? (
                  <div className="empty-state" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No graded submissions yet.</div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Participant</th>
                          <th>Assessment</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainerReport.assessmentScores.map((as, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{as.participantName}</td>
                            <td>{as.assessmentTitle}</td>
                            <td>{as.score} / {as.maxScore}</td>
                            <td>
                              <span className={`ac-chip ${as.status === 'PUBLISHED' ? 'ac-chip-success' : 'ac-chip-primary'}`}>
                                {as.status}
                              </span>
                            </td>
                            <td>{fmtDate(as.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
            borderRadius: 16, padding: '32px 32px 24px', marginBottom: 24,
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 200, height: 200,
              borderRadius: '50%', background: 'rgba(255,255,255,0.06)'
            }} />
            <div style={{
              position: 'absolute', bottom: -60, left: '30%', width: 160, height: 160,
              borderRadius: '50%', background: 'rgba(255,255,255,0.04)'
            }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                border: '3px solid rgba(255,255,255,0.4)'
              }}>
                {user.name ? user.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'TR'}
              </div>
              <div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>{user.name}</h2>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{user.email}</p>
                <span style={{
                  display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  TRAINER
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
            <div style={{
              flex: 1, background: '#fff', borderRadius: 12, padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4, fontFamily: "'Poppins', sans-serif" }}>Active</div>
              <div style={{ fontSize: 12, color: '#22c55e', marginTop: 2 }}>● Verified Trainer</div>
            </div>
            <div style={{
              flex: 1, background: '#fff', borderRadius: 12, padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trainings</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4, fontFamily: "'Poppins', sans-serif" }}>{stats.totalTrainings}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Assigned courses</div>
            </div>
            <div style={{
              flex: 1, background: '#fff', borderRadius: 12, padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg. Rating</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4, fontFamily: "'Poppins', sans-serif" }}>{stats.avgTrainerRating || '—'}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>From feedback</div>
            </div>
          </div>

          <div style={{
            background: '#fff', borderRadius: 12, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: "'Poppins', sans-serif" }}>Personal Information</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Update your profile details and photo</p>
              </div>
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

      <ParticipantProfileView
        open={!!viewingParticipant}
        userId={viewingParticipant?.id}
        fallback={viewingParticipant ? { name: viewingParticipant.name } : null}
        onClose={() => setViewingParticipant(null)}
      />
    </div>
  )
}

export default TrainerDashboard
