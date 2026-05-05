import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

import { API_BASE as API, assetUrl } from '../api/api'

/**
 * TrainerForm — full profile form for the TRAINER to fill/update their details.
 * Sends multipart/form-data to PUT /api/trainer/update.
 *
 * Fixes applied:
 *  1. File field renamed  photo  →  profileImage  (matches multer config)
 *  2. DOB normalized to YYYY-MM-DD before sending
 *  3. Client-side validation (phone numeric, DOB valid)
 *  4. Inline success / error messages — NO alert()
 *  5. Button disabled + spinner while saving
 *  6. Image preview on file select
 *  7. Reads standardized { success, message, errors[] } from API
 */
function TrainerForm({ user, onLogout }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    qualification: '',
    experience: ''
  })

  // ── Image state ──────────────────────────────────────────────────────────
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)   // blob URL for new file
  const [existingImage, setExistingImage] = useState(null) // URL from server
  const fileInputRef = useRef()

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]   = useState(true)   // initial profile load
  const [saving, setSaving]     = useState(false)   // form submit in progress
  const [message, setMessage]   = useState('')      // green success
  const [error, setError]       = useState('')      // red error (string)
  const [fieldErrors, setFieldErrors] = useState({}) // per-field validation

  // ── Password modal state ─────────────────────────────────────────────────
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '', newPassword: '', confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError]       = useState('')
  const [passwordSuccess, setPasswordSuccess]   = useState('')

  const authHeader = () => ({ Authorization: `Bearer ${user.token}` })

  // ── Load profile on mount ────────────────────────────────────────────────
  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const r = await fetch(`${API}/trainer/profile`, { headers: authHeader() })
      const d = await r.json()
      const p = d.trainer?.profile

      if (p) {
        setForm(prev => ({
          ...prev,
          name:          d.trainer?.name          || prev.name,
          phone:         p.phone                  || '',
          dob:           p.dob                    || '',
          qualification: p.qualification          || '',
          experience:    p.experience             || ''
        }))

        if (p.imagePath) {
          // Support old base64 blobs and new disk-path URLs
          if (p.imagePath.startsWith('data:')) {
            setExistingImage(p.imagePath)
          } else {
            // p.imagePath is like /uploads/trainer/xxx.jpg
            setExistingImage(assetUrl(p.imagePath))
          }
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Field change handler ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    // Clear per-field error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // ── Image selection ──────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Client-side type guard
    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
      setError('Only JPG and PNG images are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB.')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
    setError('')
  }

  // ── Client-side validation ────────────────────────────────────────────────
  const validate = () => {
    const errs = {}

    if (form.phone && !/^[\d\s\+\-\(\)]{7,15}$/.test(form.phone.trim())) {
      errs.phone = 'Phone must contain only digits, spaces, +, -, (, )'
    }

    if (form.dob) {
      const parsed = new Date(form.dob)
      if (isNaN(parsed.getTime())) {
        errs.dob = 'Please enter a valid date of birth'
      } else if (parsed > new Date()) {
        errs.dob = 'Date of birth cannot be in the future'
      }
    }

    return errs
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setFieldErrors({})

    // Run client-side validation first
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      if (form.name)          formData.append('name',          form.name.trim())
      if (form.phone)         formData.append('phone',         form.phone.trim())
      if (form.qualification) formData.append('qualification', form.qualification.trim())
      if (form.experience)    formData.append('experience',    form.experience.trim())

      // Normalize DOB to YYYY-MM-DD (HTML date input already gives this, but be explicit)
      if (form.dob) {
        const normalized = new Date(form.dob).toISOString().split('T')[0]
        formData.append('dob', normalized)
      }

      // ✅ CRITICAL FIX: field name must match multer's upload.single('profilePic')
      if (imageFile) {
        formData.append('profilePic', imageFile)
      }

      console.log('📤 Submitting profile update:', {
        name: form.name, phone: form.phone, dob: form.dob,
        qualification: form.qualification, experience: form.experience,
        hasImage: !!imageFile
      })

      const response = await axios.put(`${API}/update-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`
        }
      })

      const { data } = response
      setMessage(data.message || 'Profile saved successfully!')

      // Update displayed image to the new server path
      if (data.data?.profile?.imagePath) {
        const imgPath = data.data.profile.imagePath
        setExistingImage(
          imgPath.startsWith('data:') ? imgPath : assetUrl(imgPath)
        )
      }

      // Clear new-file state
      setImageFile(null)
      setImagePreview(null)

      // Refresh full profile to pick up any server-side normalizations
      fetchProfile()

    } catch (err) {
      console.error('Profile update error:', err)

      // ── Structured error reading ───────────────────────────────────────
      const resData = err.response?.data
      if (resData?.errors && Array.isArray(resData.errors)) {
        // Validation errors array from the backend
        setError(resData.errors.join(' • '))
      } else {
        setError(
          resData?.message ||
          err.message      ||
          'Failed to update profile. Please try again.'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Password change ───────────────────────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    try {
      const r = await fetch(`${API}/trainer/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || d.message || 'Failed to change password')
      setPasswordSuccess('Password changed successfully!')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setShowPasswordModal(false), 1500)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const displayImage = imagePreview || existingImage
  const initials = (name) =>
    name ? name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'TR'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="trainer-form-wrap">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>Loading profile…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="trainer-profile-form" noValidate>

          {/* ── Profile Image ─────────────────────────────────────────── */}
          <div className="profile-image-section">
            <div className="profile-image-wrapper">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Profile"
                  className="profile-image-preview"
                  onError={e => {
                    e.target.style.display = 'none'
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div
                className="profile-image-initials"
                style={{ display: displayImage ? 'none' : 'flex' }}
              >
                {initials(user.name)}
              </div>
              <button
                type="button"
                className="profile-image-edit-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change photo"
              >
                &#9998;
              </button>
            </div>

            <div className="profile-image-meta">
              <div className="profile-name">{user.name}</div>
              <div className="profile-email">{user.email}</div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginTop: 8 }}
              >
                {displayImage ? 'Change Photo' : 'Upload Photo'}
              </button>
              {imageFile && (
                <span style={{ fontSize: 12, color: 'var(--success)', marginTop: 6, display: 'block' }}>
                  ✓ {imageFile.name} selected
                </span>
              )}
            </div>

            {/* Hidden file input — multer field name: profileImage */}
            <input
              ref={fileInputRef}
              id="profile-image-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>

          {/* ── Form Fields ───────────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-control"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                className={`form-control${fieldErrors.phone ? ' is-invalid' : ''}`}
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
              />
              {fieldErrors.phone && (
                <span className="field-error" style={{ color: 'var(--danger, #e53e3e)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {fieldErrors.phone}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                className={`form-control${fieldErrors.dob ? ' is-invalid' : ''}`}
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
              />
              {fieldErrors.dob && (
                <span className="field-error" style={{ color: 'var(--danger, #e53e3e)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {fieldErrors.dob}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Qualification <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>(optional)</span></label>
            <input
              className="form-control"
              type="text"
              name="qualification"
              value={form.qualification}
              onChange={handleChange}
              placeholder="e.g. M.Tech, Ph.D, MBA"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Experience <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>(optional)</span></label>
            <textarea
              className="form-control"
              name="experience"
              value={form.experience}
              onChange={handleChange}
              placeholder="Describe your teaching experience, specializations, achievements…"
              rows={4}
            />
          </div>

          {/* ── Inline feedback ───────────────────────────────────────── */}
          {error && (
            <div
              className="error"
              style={{
                background: 'rgba(229,62,62,0.1)',
                border: '1px solid rgba(229,62,62,0.4)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--danger, #e53e3e)',
                fontSize: 14
              }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              className="success"
              style={{
                background: 'rgba(56,161,105,0.1)',
                border: '1px solid rgba(56,161,105,0.4)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--success, #38a169)',
                fontSize: 14
              }}
            >
              ✓ {message}
            </div>
          )}

          {/* ── Action buttons ────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <button
              type="submit"
              className="btn btn-primary"
              id="save-profile-btn"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {saving && (
                <span
                  className="spinner"
                  style={{ width: 14, height: 14, borderWidth: 2 }}
                />
              )}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>

            <button
              type="button"
              className="btn"
              id="change-password-btn"
              onClick={() => {
                setPasswordError('')
                setPasswordSuccess('')
                setShowPasswordModal(true)
              }}
            >
              Change Password
            </button>
          </div>
        </form>
      )}

      {/* ── Password Modal ───────────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>

            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, oldPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              {passwordError && (
                <div className="error" style={{ marginBottom: 12, color: 'var(--danger, #e53e3e)', fontSize: 14 }}>
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="success" style={{ marginBottom: 12, color: 'var(--success, #38a169)', fontSize: 14 }}>
                  ✓ {passwordSuccess}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="confirm-password-btn"
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainerForm
