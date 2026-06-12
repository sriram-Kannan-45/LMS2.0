import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Mail, Lock, Shield, GraduationCap, User,
  CheckCircle2, AlertCircle, ArrowRight, Loader2,
  Sparkles, TrendingUp, Lightbulb, Bot
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { API } from '../api/api'
import loginIllustration from '../assets/green.png'

const AI_CARDS = [
  {
    id: 'personalized',
    icon: Sparkles,
    title: 'AI Content Gen',
    subtitle: '1-click quiz creator',
    accent: '#22c55e',
    pos: { top: '6%', left: '3%' },
    from: { x: -40, y: -20 },
  },
  {
    id: 'progress',
    icon: TrendingUp,
    title: 'Student Metrics',
    subtitle: '+15% score average',
    accent: '#10b981',
    pos: { top: '8%', right: '4%' },
    from: { x: 40, y: -20 },
  },
  {
    id: 'recommend',
    icon: Lightbulb,
    title: 'Grading Copilot',
    subtitle: '22 submissions analyzed',
    accent: '#3b82f6',
    pos: { top: '42%', right: '3%' },
    from: { x: 40, y: 20 },
  },
]

function AIFloatingCards({ visible }) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12, delayChildren: 0.05 },
    },
    exit: {
      transition: { staggerChildren: 0.06, staggerDirection: -1 },
    },
  }

  const cardVariants = (from) => ({
    hidden: { opacity: 0, scale: 0.8, x: from.x, y: from.y },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: { type: 'spring', stiffness: 220, damping: 22 },
    },
    exit: {
      opacity: 0,
      scale: 0.85,
      x: from.x * 0.5,
      y: from.y * 0.5,
      transition: { duration: 0.25, ease: 'easeIn' },
    },
  })

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="ai-cards-layer"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="ai-bubble"
            style={{ bottom: '34%', left: '22%' }}
            variants={{
              hidden: { opacity: 0, scale: 0.85, y: 16, x: -8 },
              visible: {
                opacity: 1,
                scale: 1,
                y: 0,
                x: 0,
                transition: { type: 'spring', stiffness: 260, damping: 20, delay: 0.08 },
              },
              exit: {
                opacity: 0,
                scale: 0.88,
                y: 10,
                transition: { duration: 0.2, ease: 'easeIn' },
              },
            }}
          >
            <div className="ai-bubble-inner">
              <div className="ai-bubble-avatar">
                <Bot size={14} strokeWidth={2.4} />
              </div>
              <div className="ai-bubble-body">
                <span className="ai-bubble-title">AI Trainer assistant</span>
                <span className="ai-bubble-text">Let's create engaging assessments for your classes!</span>
              </div>
            </div>
            <span className="ai-bubble-tail" />
          </motion.div>

          {AI_CARDS.map(({ id, icon: Icon, title, subtitle, accent, pos, from }) => (
            <motion.div
              key={id}
              className="ai-feature-card"
              style={{ ...pos, '--card-accent': accent }}
              variants={cardVariants(from)}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="ai-feature-icon">
                <Icon size={16} strokeWidth={2.4} />
              </div>
              <div className="ai-feature-text">
                <span className="ai-feature-title">{title}</span>
                <span className="ai-feature-sub">{subtitle}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TrainerLogin({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', role: 'TRAINER' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [aiCardsVisible, setAiCardsVisible] = useState(false)

  const navigate = useNavigate()
  const navTimeoutRef = useRef(null)
  const location = useLocation()
  const { success: showSuccess, error: showError } = useToast()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlHeight = document.documentElement.style.height
    const prevBodyHeight = document.body.style.height
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.height = '100%'
    document.body.style.height = '100%'

    localStorage.setItem('lastRole', 'TRAINER')

    const remembered = localStorage.getItem('rememberedEmail')
    const remember = localStorage.getItem('rememberMe') === 'true'
    if (remember && remembered) {
      setForm(p => ({ ...p, email: remembered }))
      setRememberMe(true)
    }

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.height = prevHtmlHeight
      document.body.style.height = prevBodyHeight
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message)
      showSuccess(location.state.message)
      setTimeout(() => setSuccess(''), 3000)
    }
  }, [location.state, showSuccess])

  const validateForm = () => {
    if (!form.email) {
      setError('Email address or Username is required')
      showError('Email address or Username is required')
      return false
    }
    if (!form.password) {
      setError('Password is required')
      showError('Password is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return

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
        throw new Error(data.error || 'Login failed')
      }

      localStorage.setItem('user', JSON.stringify(data))
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('rememberedEmail', form.email)
      } else {
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('rememberedEmail')
      }

      setSuccess('Welcome! Redirecting to hub...')
      showSuccess('Welcome! Redirecting to hub...')
      onLogin(data)

      navTimeoutRef.current = setTimeout(() => {
        navigate('/trainer')
      }, 500)
    } catch (err) {
      const msg = err.message === 'Failed to fetch' ? 'Cannot connect to server.' : err.message
      setError(msg)
      showError(msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="premium-login-page">
      {/* ─── LEFT VISUAL PANEL ─── */}
      <aside className="login-visual-panel">
        <div className="visual-bg-gradient" />
        <div className="visual-glow visual-glow-1" />
        <div className="visual-glow visual-glow-2" />

        <motion.div
          className="visual-image-wrap"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src={loginIllustration}
            alt="AI-powered learning illustration"
            className="visual-image"
            draggable={false}
          />
          <div className="visual-image-overlay" />
        </motion.div>

        <motion.button
          type="button"
          className={`robot-hotspot ${aiCardsVisible ? 'is-active' : ''}`}
          onClick={() => setAiCardsVisible(v => !v)}
          aria-label={aiCardsVisible ? 'Hide AI features' : 'Reveal AI features'}
          aria-pressed={aiCardsVisible}
          whileTap={{ scale: 0.94 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <span className="robot-hotspot-pulse" />
          <span className="robot-hotspot-pulse robot-hotspot-pulse-2" />
          <span className="robot-hotspot-ring" />
        </motion.button>

        <motion.div
          className="visual-float visual-float-1"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="visual-float-dot" />
          <span>AI Online</span>
        </motion.div>

        <AIFloatingCards visible={aiCardsVisible} />

        <AnimatePresence>
          {!aiCardsVisible && (
            <motion.div
              className="robot-tap-hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: 1.4, duration: 0.4 }}
            >
              <Sparkles size={12} strokeWidth={2.4} />
              <span>Tap the robot to explore AI features</span>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* ─── RIGHT FORM PANEL ─── */}
      <section className="login-form-panel">
        <div className="premium-login-bg">
          <div className="premium-bg-shape premium-bg-shape-1" />
          <div className="premium-bg-shape premium-bg-shape-2" />
        </div>

        <motion.div
          className="premium-login-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="premium-login-card">
            <div className="premium-card-accent" />

            <div className="premium-card-body">
              {/* WaveInit Logo */}
              <div className="premium-logo-container">
                <div className="premium-logo-icon-box">
                  <svg className="premium-logo-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="trainer-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop stopColor="var(--brand-600)" />
                        <stop offset="1" stopColor="var(--brand-400)" />
                      </linearGradient>
                    </defs>
                    <rect width="32" height="32" rx="8" fill="url(#trainer-logo-grad)" />
                    <path d="M7 16C9.5 16 11 11 13 11C15 11 16.5 21 18.5 21C20.5 21 22 16 25 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="premium-logo-text">Wave<span className="premium-logo-highlight">Init</span></span>
              </div>

              {/* Portal Header */}
              <div className="portal-header-section">
                <h1 className="portal-title">Trainer Hub</h1>
                <p className="portal-subtitle">Course Creation & Mentoring Space</p>
              </div>

              {/* Alerts */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="premium-alert premium-alert-error"
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
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="premium-alert premium-alert-success"
                  >
                    <CheckCircle2 size={16} />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <div className={`premium-field ${focusedField === 'email' ? 'focused' : ''}`}>
                  <label htmlFor="login-email" className="premium-label">Username or Email</label>
                  <div className="premium-input-wrapper">
                    <Mail size={18} className="premium-input-icon" />
                    <input
                      id="login-email"
                      type="text"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="trainer_username"
                      autoComplete="username"
                      className="premium-input"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className={`premium-field ${focusedField === 'password' ? 'focused' : ''}`}>
                  <label htmlFor="login-password" className="premium-label">Password</label>
                  <div className="premium-input-wrapper">
                    <Lock size={18} className="premium-input-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="premium-input"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="premium-password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot */}
                <div className="premium-options-row">
                  <label className="premium-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="premium-checkbox"
                    />
                    <span className="premium-checkmark" />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="premium-forgot-link"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className="premium-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="premium-spinner" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In as Trainer</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Switch Portal */}
              <div className="premium-switch-roles">
                <span className="premium-switch-label">Switch Portal</span>
                <div className="premium-switch-links">
                  <button type="button" onClick={() => navigate('/admin')} className="premium-switch-link">
                    <Shield size={15} />
                    <span>Admin Portal</span>
                  </button>
                  <button type="button" onClick={() => navigate('/participant')} className="premium-switch-link">
                    <User size={15} />
                    <span>Participant Space</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="premium-footer">© 2026 · WaveInit LMS · Trainer Portal</p>
        </motion.div>
      </section>
    </div>
  )
}

export default TrainerLogin
