import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API } from '../api/api'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

function Register({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch(API.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      // Show success message and redirect to login
      setSuccess('✓ Registration successful! Waiting for admin approval. Check your email for confirmation.')
      setForm({ name: '', email: '', password: '', phone: '' })
      // Use a success state instead and show message
      setTimeout(() => {
        navigate('/login', { state: { message: 'Your account is pending admin approval. You will be notified by email once approved.' } })
      }, 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="login-page">
        <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">W</div>
          <h1>WAVE INIT LMS</h1>
          <p>Create Participant Account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!success ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input id="reg-name" className="form-control" type="text" value={form.name}
              onChange={e => set('name', e.target.value)} required placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input id="reg-email" className="form-control" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} required placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input id="reg-phone" className="form-control" type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)} required placeholder="e.g. 9876543210" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="reg-password" className="form-control" type="password" value={form.password}
              onChange={e => set('password', e.target.value)} required placeholder="Minimum 6 characters" minLength={6} />
          </div>
          <button id="reg-submit" type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        ) : (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Redirecting to login...</p>
          </div>
        )}

        <p className="register-link">
          Already registered? <span onClick={() => navigate('/login')}>Sign In</span>
        </p>
      </div>
    </div>
    </motion.div>
  )
}

export default Register