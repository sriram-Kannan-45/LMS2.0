import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useToast } from '../components/Toast'
import { API } from '../api/api'

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
      try {
        data = await res.json()
      } catch (parseErr) {
        throw new Error('Server error or unavailable. Please try again.')
      }

      if (!res.ok) {
        if (res.status === 403 && data.error?.includes('pending')) {
          throw new Error('⏳ Your account is pending approval')
        } else {
          throw new Error(data.error || 'Login failed')
        }
      }

      localStorage.setItem('user', JSON.stringify(data))
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('rememberedEmail', form.email)
      } else {
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('rememberedEmail')
      }

      const successMsg = 'Welcome! Redirecting...'
      setSuccess(successMsg)
      showSuccess(successMsg)
      onLogin(data)
      
      setTimeout(() => {
        if (data.role === 'ADMIN') navigate('/admin')
        else if (data.role === 'TRAINER') navigate('/trainer')
        else navigate('/participant')
      }, 300)
    } catch (err) {
      const errorMsg = err.message === 'Failed to fetch' ? 'Cannot connect to server. Please check your connection.' : err.message
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo Section */}
        <div className="login-logo">
          <div className="login-logo-mark">W</div>
          <h1>WAVE INIT LMS</h1>
          <p>Training Feedback System</p>
        </div>

        {/* Error Alert */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email or Username</label>
            <input
              id="login-email"
              type="text"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="Enter email or username"
              autoComplete="username"
              className="form-control"
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="form-control"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role Selection */}
          <div className="form-group">
            <label htmlFor="login-role" className="form-label">Login as</label>
            <select
              id="login-role"
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="form-control"
            >
              <option value="PARTICIPANT">Participant</option>
              <option value="TRAINER">Trainer</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          {/* Remember Me */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="login-footer-link">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="link-button"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign Up Link */}
        {form.role === 'PARTICIPANT' && (
          <p className="register-link">
            No account?{' '}
            <span onClick={() => navigate('/register')}>Register as Participant</span>
          </p>
        )}

        {/* Hint */}
        <div className="login-hint">Default admin: admin@test.com / admin123</div>
      </div>
    </div>
  )
}

export default Login