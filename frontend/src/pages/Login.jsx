import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Mail, Lock, User, GraduationCap, Shield,
  CheckCircle2, AlertCircle, ArrowRight, Loader2
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { API } from '../api/api'

/* ─── Role Config ─── */
const roles = [
  { value: 'PARTICIPANT', label: 'Participant', icon: User, color: '#6366f1' },
  { value: 'TRAINER', label: 'Trainer', icon: GraduationCap, color: '#8b5cf6' },
  { value: 'ADMIN', label: 'Admin', icon: Shield, color: '#ec4899' },
]

/* ═══════════════════ CLASSIC LOGIN ═══════════════════ */
function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', role: 'PARTICIPANT' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { success: showSuccess, error: showError } = useToast()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message)
      showSuccess(location.state.message)
      setTimeout(() => setSuccess(''), 3000)
    }
  }, [location.state, showSuccess])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Please fill in all fields')
      showError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(API.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      let data
      try { data = await res.json() } catch { throw new Error('Server error or unavailable. Please try again.') }
      if (!res.ok) {
        if (res.status === 403 && data.error?.includes('pending')) throw new Error('⏳ Your account is pending approval')
        else throw new Error(data.error || 'Login failed')
      }
      localStorage.setItem('user', JSON.stringify(data))
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('rememberedEmail', form.email)
      } else {
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('rememberedEmail')
      }
      setSuccess('Welcome! Redirecting...')
      showSuccess('Welcome! Redirecting...')
      onLogin(data)
      setTimeout(() => {
        if (data.role === 'ADMIN') navigate('/admin')
        else if (data.role === 'TRAINER') navigate('/trainer')
        else navigate('/participant')
      }, 300)
    } catch (err) {
      const msg = err.message === 'Failed to fetch' ? 'Cannot connect to server.' : err.message
      setError(msg)
      showError(msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="classic-login-page">
      {/* Subtle background decoration */}
      <div className="classic-login-bg">
        <div className="classic-bg-shape classic-bg-shape-1" />
        <div className="classic-bg-shape classic-bg-shape-2" />
      </div>

      <motion.div
        className="classic-login-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo & Brand Header */}
        <div className="classic-login-header">
          <motion.div
            className="classic-logo"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            W
          </motion.div>
          <h1 className="classic-brand-name">WAVE INIT</h1>
          <p className="classic-brand-tagline">Learning Management System</p>
        </div>

        {/* Card */}
        <div className="classic-login-card">
          <div className="classic-card-accent" />

          <div className="classic-card-body">
            <h2 className="classic-card-title">Sign in to your account</h2>
            <p className="classic-card-subtitle">Enter your credentials to continue</p>

            {/* Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="classic-alert classic-alert-error"
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="classic-alert classic-alert-success"
                >
                  <CheckCircle2 size={16} />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className={`classic-field ${focusedField === 'email' ? 'focused' : ''}`}>
                <label htmlFor="login-email" className="classic-label">Email Address</label>
                <div className="classic-input-wrapper">
                  <Mail size={18} className="classic-input-icon" />
                  <input
                    id="login-email"
                    type="text"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="you@example.com"
                    autoComplete="username"
                    className="classic-input"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className={`classic-field ${focusedField === 'password' ? 'focused' : ''}`}>
                <label htmlFor="login-password" className="classic-label">Password</label>
                <div className="classic-input-wrapper">
                  <Lock size={18} className="classic-input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="classic-input"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="classic-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="classic-field">
                <label className="classic-label">Select Role</label>
                <div className="classic-role-grid">
                  {roles.map(r => {
                    const Icon = r.icon
                    const sel = form.role === r.value
                    return (
                      <motion.button
                        key={r.value}
                        type="button"
                        onClick={() => set('role', r.value)}
                        whileTap={{ scale: 0.97 }}
                        className={`classic-role-btn ${sel ? 'selected' : ''}`}
                        style={sel ? { borderColor: r.color, '--role-color': r.color } : { '--role-color': r.color }}
                      >
                        <div className="classic-role-icon" style={sel ? { background: `${r.color}15`, color: r.color } : {}}>
                          <Icon size={20} />
                        </div>
                        <span className="classic-role-label">{r.label}</span>
                        {sel && (
                          <motion.div
                            layoutId="roleCheck"
                            className="classic-role-check"
                            style={{ background: r.color }}
                            initial={false}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Remember Me & Forgot */}
              <div className="classic-options-row">
                <label className="classic-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="classic-checkbox"
                  />
                  <span className="classic-checkmark" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="classic-forgot-link"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <motion.button
                id="login-submit"
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="classic-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="classic-spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="classic-divider">
              <span>or</span>
            </div>

            {/* Register Link */}
            {form.role === 'PARTICIPANT' && (
              <p className="classic-register-text">
                Don't have an account?{' '}
                <button type="button" onClick={() => navigate('/register')} className="classic-register-link">
                  Create Account
                </button>
              </p>
            )}

            {/* Demo hint */}
            <div className="classic-demo-box">
              <span className="classic-demo-label">Demo Credentials:</span>
              <span className="classic-demo-value">admin@test.com / admin123</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="classic-footer">© 2024 WAVE INIT LMS. All rights reserved.</p>
      </motion.div>

      <style>{`
        /* ═══════════════════════════════════════════════
           CLASSIC LOGIN PAGE STYLES
           ═══════════════════════════════════════════════ */
        .classic-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          background: #f0f2f5;
          background-image: 
            radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 100%, rgba(139,92,246,0.05) 0%, transparent 50%);
        }

        .classic-login-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .classic-bg-shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.5;
        }

        .classic-bg-shape-1 {
          width: 600px;
          height: 600px;
          top: -200px;
          right: -150px;
          background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
        }

        .classic-bg-shape-2 {
          width: 500px;
          height: 500px;
          bottom: -200px;
          left: -150px;
          background: radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%);
        }

        .classic-login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
        }

        /* ── Header ── */
        .classic-login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .classic-logo {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          margin-bottom: 16px;
          box-shadow: 0 8px 24px rgba(99,102,241,0.25);
          cursor: pointer;
        }

        .classic-brand-name {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }

        .classic-brand-tagline {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
          margin: 0;
        }

        /* ── Card ── */
        .classic-login-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 
            0 1px 3px rgba(0,0,0,0.04),
            0 8px 24px rgba(0,0,0,0.06),
            0 20px 48px rgba(0,0,0,0.04);
          overflow: hidden;
          position: relative;
        }

        .classic-card-accent {
          height: 4px;
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
        }

        .classic-card-body {
          padding: 36px 32px 32px;
        }

        .classic-card-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          font-family: 'Outfit', sans-serif;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }

        .classic-card-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 28px;
          font-weight: 400;
        }

        /* ── Alerts ── */
        .classic-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          overflow: hidden;
        }

        .classic-alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .classic-alert-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
        }

        /* ── Form Fields ── */
        .classic-field {
          margin-bottom: 20px;
        }

        .classic-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          letter-spacing: 0.01em;
        }

        .classic-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .classic-input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
          transition: color 0.2s ease;
          z-index: 1;
        }

        .classic-field.focused .classic-input-icon {
          color: #6366f1;
        }

        .classic-input {
          width: 100%;
          height: 48px;
          padding: 0 14px 0 44px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s ease;
          outline: none;
        }

        .classic-input::placeholder {
          color: #cbd5e1;
        }

        .classic-input:focus {
          background: #fff;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .classic-password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
          z-index: 1;
        }

        .classic-password-toggle:hover {
          color: #6366f1;
        }

        /* ── Role Selection ── */
        .classic-role-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .classic-role-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 16px 8px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .classic-role-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .classic-role-btn.selected {
          background: #fff;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .classic-role-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #94a3b8;
          transition: all 0.2s ease;
        }

        .classic-role-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          transition: color 0.2s ease;
        }

        .classic-role-btn.selected .classic-role-label {
          color: var(--role-color, #6366f1);
        }

        .classic-role-check {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        /* ── Options Row ── */
        .classic-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .classic-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #64748b;
          cursor: pointer;
          user-select: none;
          position: relative;
        }

        .classic-checkbox {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .classic-checkmark {
          width: 18px;
          height: 18px;
          border: 1.5px solid #d1d5db;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          background: #fff;
          flex-shrink: 0;
        }

        .classic-checkbox:checked + .classic-checkmark {
          background: #6366f1;
          border-color: #6366f1;
        }

        .classic-checkbox:checked + .classic-checkmark::after {
          content: '';
          width: 5px;
          height: 9px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-top: -1px;
        }

        .classic-forgot-link {
          background: none;
          border: none;
          font-size: 13.5px;
          font-weight: 600;
          color: #6366f1;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          transition: color 0.2s ease;
        }

        .classic-forgot-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        /* ── Submit Button ── */
        .classic-submit-btn {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          position: relative;
          overflow: hidden;
        }

        .classic-submit-btn:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
          transform: translateY(-1px);
        }

        .classic-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }

        .classic-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .classic-spinner {
          animation: classicSpin 0.8s linear infinite;
        }

        @keyframes classicSpin {
          to { transform: rotate(360deg); }
        }

        /* ── Divider ── */
        .classic-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 24px 0;
        }

        .classic-divider::before,
        .classic-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .classic-divider span {
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ── Register Link ── */
        .classic-register-text {
          text-align: center;
          font-size: 14px;
          color: #64748b;
          margin: 0 0 16px;
        }

        .classic-register-link {
          background: none;
          border: none;
          font-weight: 600;
          color: #6366f1;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          font-size: 14px;
          transition: color 0.2s ease;
        }

        .classic-register-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        /* ── Demo Box ── */
        .classic-demo-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .classic-demo-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .classic-demo-value {
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          font-family: 'Inter', monospace;
        }

        /* ── Footer ── */
        .classic-footer {
          text-align: center;
          margin-top: 28px;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 400;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .classic-login-page {
            padding: 16px;
            align-items: flex-start;
            padding-top: 40px;
          }

          .classic-card-body {
            padding: 28px 20px 24px;
          }

          .classic-login-header {
            margin-bottom: 24px;
          }
        }

        /* Fix autofill styles */
        .classic-input:-webkit-autofill,
        .classic-input:-webkit-autofill:hover,
        .classic-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #0f172a !important;
          -webkit-box-shadow: 0 0 0 30px #f8fafc inset !important;
          caret-color: #0f172a;
          transition: background-color 5000s ease-in-out 0s;
        }

        .classic-input:focus:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #fff inset !important;
        }
      `}</style>
    </div>
  )
}

export default Login