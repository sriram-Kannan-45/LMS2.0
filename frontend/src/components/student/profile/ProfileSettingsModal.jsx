import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, FileText, Tags, Globe, Code2, Briefcase, Bird,
  Save, Plus, Trash2, AlertCircle,
} from 'lucide-react'
import ProfileAvatar from './ProfileAvatar'
import { assetUrl } from '../../../api/api'

const MAX_BIO = 200
const MAX_NAME = 60
const MAX_SKILL = 30
const MAX_SKILLS = 12

function isValidUrl(value) {
  if (!value) return true
  try {
    const u = new URL(value.startsWith('http') ? value : `https://${value}`)
    return !!u.hostname && u.hostname.includes('.')
  } catch { return false }
}

/**
 * ProfileSettingsModal — editable profile settings.
 *
 * Props:
 *   open     — boolean
 *   onClose  — fn()
 *   profile  — current profile object
 *   user     — auth user (used for avatar fallback initials & display name fallback)
 *   initials — computed initials from useParticipantProfile
 *   onSave   — fn(patch) → persisted by parent (useParticipantProfile.updateProfile)
 */
export default memo(function ProfileSettingsModal({
  open,
  onClose,
  profile,
  user,
  initials = 'U',
  onSave,
  onAvatarUpload,   // (file) → Promise — multipart POST
  onAvatarClear,    // ()     → Promise — DELETE
}) {
  const [form, setForm] = useState({
    avatarFile: null,
    avatarPreview: null,
    avatarRemoved: false,
    displayName: profile?.displayName ?? user?.name ?? '',
    bio: profile?.bio ?? '',
    skills: profile?.skills ?? [],
    links: { ...{ website: '', github: '', linkedin: '', twitter: '' }, ...(profile?.links || {}) },
  })
  const [skillInput, setSkillInput] = useState('')
  const [errors, setErrors] = useState({})
  const skillRef = useRef(null)

  // Re-sync state whenever modal is opened
  // Reset the form ONLY when the modal transitions from closed → open.
  // Re-syncing on every `profile` reference change (which can fire mid-typing
  // when the hook re-fetches or persists) would clobber what the user just
  // typed and tear focus off the input.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setForm((prev) => {
        // Revoke any leftover blob preview from a previous edit session.
        if (prev?.avatarPreview && prev.avatarPreview.startsWith('blob:')) {
          try { URL.revokeObjectURL(prev.avatarPreview) } catch { /* ignore */ }
        }
        return {
          avatarFile: null,
          avatarPreview: null,
          avatarRemoved: false,
          displayName: profile?.displayName ?? user?.name ?? '',
          bio: profile?.bio ?? '',
          skills: profile?.skills ?? [],
          links: { ...{ website: '', github: '', linkedin: '', twitter: '' }, ...(profile?.links || {}) },
        }
      })
      setErrors({})
      setSkillInput('')
    }
    wasOpenRef.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Keep the latest onClose in a ref so the ESC/scroll-lock effect below
  // does NOT re-run every time the parent re-renders (which would unmount
  // and re-add the keydown listener on every keystroke if onClose's
  // identity changed).
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  // ESC to close + body scroll lock — depends only on `open`.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }))
  const setLink = (key, value) =>
    setForm((p) => ({ ...p, links: { ...p.links, [key]: value } }))

  const addSkill = () => {
    const v = skillInput.trim().slice(0, MAX_SKILL)
    if (!v) return
    if (form.skills.length >= MAX_SKILLS) return
    if (form.skills.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setErrors((e) => ({ ...e, skill: 'Skill already added' }))
      return
    }
    setErrors((e) => ({ ...e, skill: undefined }))
    setForm((p) => ({ ...p, skills: [...p.skills, v] }))
    setSkillInput('')
    skillRef.current?.focus()
  }

  const removeSkill = (idx) =>
    setForm((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }))

  const validate = () => {
    const e = {}
    if (!form.displayName?.trim()) e.displayName = 'Name is required'
    else if (form.displayName.trim().length < 2) e.displayName = 'Name is too short'
    if (form.bio && form.bio.length > MAX_BIO) e.bio = `Keep your bio under ${MAX_BIO} characters`
    Object.entries(form.links).forEach(([k, v]) => {
      if (v && !isValidUrl(v)) e[`links.${k}`] = 'Looks like an invalid URL'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const [submitting, setSubmitting] = useState(false)

  const [avatarProgress, setAvatarProgress] = useState(0)

  const handleSave = async () => {
    if (!validate()) return
    if (submitting) return
    setSubmitting(true)
    try {
      // Step 1: avatar (multipart) — only if user touched it.
      if (form.avatarFile && onAvatarUpload) {
        setAvatarProgress(0)
        await onAvatarUpload(form.avatarFile, {
          onProgress: ({ percent }) => setAvatarProgress(percent),
        })
      } else if (form.avatarRemoved && profile?.avatarUrl && onAvatarClear) {
        await onAvatarClear()
      }

      // Step 2: JSON metadata — name, bio, skills, links. avatarUrl is
      // intentionally NOT part of this payload.
      await onSave?.({
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        skills: form.skills,
        links: form.links,
      })
      onClose?.()
    } catch {
      // Parent already surfaced an error toast; keep the modal open so the
      // user can retry.
    } finally {
      setSubmitting(false)
      setAvatarProgress(0)
    }
  }

  const bioCount = useMemo(() => (form.bio || '').length, [form.bio])

  // Portal target — document.body so the modal escapes any framer-motion
  // transform ancestors (which would otherwise hijack `position: fixed`
  // and push the modal off-screen). The wrapper re-applies the theme
  // classes so the scoped CSS still resolves.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="theme-academic" data-look="classic">
      <AnimatePresence>
        {open && (
          <motion.div
            key="bg"
            className="pf-modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              key="modal"
              className="pf-modal"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pf-settings-title"
              // Stop clicks (and the synthetic mouse events React fires while
              // typing into native inputs) from bubbling up to the backdrop's
              // onClick={onClose}, which would otherwise close the modal mid-edit.
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="pf-modal__head">
              <div>
                <h2 id="pf-settings-title" style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 18, fontWeight: 800, margin: 0 }}>
                  Edit profile
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--academic-text-muted)', margin: '4px 0 0' }}>
                  Personalise how others see you. Saved locally — your account email stays the same.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="ac-btn ac-btn-ghost"
                style={{ padding: 8, borderRadius: 10 }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="pf-modal__body">
              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
                <ProfileAvatar
                  src={
                    form.avatarPreview
                      ? form.avatarPreview
                      : form.avatarRemoved
                        ? null
                        : assetUrl(profile?.avatarUrl)
                  }
                  initials={initials}
                  size={108}
                  editable
                  onChange={(file) => {
                    if (!(file instanceof Blob)) return
                    const objectUrl = URL.createObjectURL(file)
                    setForm((p) => {
                      // Revoke the previous preview blob if any.
                      if (p.avatarPreview && p.avatarPreview.startsWith('blob:')) {
                        try { URL.revokeObjectURL(p.avatarPreview) } catch { /* ignore */ }
                      }
                      return {
                        ...p,
                        avatarFile: file,
                        avatarPreview: objectUrl,
                        avatarRemoved: false,
                      }
                    })
                  }}
                  onClear={() => {
                    setForm((p) => {
                      if (p.avatarPreview && p.avatarPreview.startsWith('blob:')) {
                        try { URL.revokeObjectURL(p.avatarPreview) } catch { /* ignore */ }
                      }
                      return {
                        ...p,
                        avatarFile: null,
                        avatarPreview: null,
                        avatarRemoved: true,
                      }
                    })
                  }}
                  showEmptyHint
                />
                <p style={{ fontSize: 12, color: 'var(--academic-text-muted)' }}>
                  Drag & drop or click to upload • PNG, JPG, GIF, WEBP — auto-compressed
                </p>
                {submitting && form.avatarFile && (
                  <div style={{ width: '100%', maxWidth: 240 }}>
                    <div
                      style={{
                        width: '100%',
                        height: 4,
                        borderRadius: 999,
                        background: 'rgba(15,23,42,0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${avatarProgress}%`,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                          transition: 'width 200ms ease',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 11,
                        color: '#475569',
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      Uploading photo… {avatarProgress}%
                    </div>
                  </div>
                )}
              </div>

              {/* Name */}
              <Field
                icon={User}
                label="Display name"
                error={errors.displayName}
                hint={`${(form.displayName || '').length}/${MAX_NAME}`}
              >
                <input
                  className="pf-input"
                  placeholder="Your full name"
                  maxLength={MAX_NAME}
                  value={form.displayName}
                  onChange={(e) => setField('displayName', e.target.value)}
                  aria-invalid={!!errors.displayName}
                />
              </Field>

              {/* Bio */}
              <Field
                icon={FileText}
                label="Bio"
                error={errors.bio}
                hint={`${bioCount}/${MAX_BIO}`}
              >
                <textarea
                  className="pf-textarea"
                  placeholder="Tell us a little about yourself, your goals, or what you're learning…"
                  maxLength={MAX_BIO}
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                  aria-invalid={!!errors.bio}
                />
              </Field>

              {/* Skills */}
              <Field
                icon={Tags}
                label="Skills"
                hint={`${form.skills.length}/${MAX_SKILLS}`}
                error={errors.skill}
              >
                <div className="flex" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <AnimatePresence initial={false}>
                    {form.skills.map((s, i) => (
                      <motion.span
                        key={s + i}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className="pf-skill"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(i)}
                          aria-label={`Remove ${s}`}
                          style={{
                            border: 0, background: 'transparent',
                            color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 0,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={skillRef}
                    className="pf-input"
                    placeholder="e.g. React, Python, Public speaking"
                    maxLength={MAX_SKILL}
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addSkill() }
                    }}
                    disabled={form.skills.length >= MAX_SKILLS}
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    disabled={!skillInput.trim() || form.skills.length >= MAX_SKILLS}
                    className="ac-btn ac-btn-primary"
                    style={{ paddingInline: 14 }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </Field>

              {/* Links */}
              <div className="pf-field">
                <span className="pf-label"><Globe size={13} /> Links</span>
                <div style={{ display: 'grid', gap: 8 }}>
                  <LinkRow
                    icon={Globe}
                    placeholder="https://yourwebsite.com"
                    value={form.links.website}
                    onChange={(v) => setLink('website', v)}
                    error={errors['links.website']}
                  />
                  <LinkRow
                    icon={Code2}
                    placeholder="github.com/username"
                    value={form.links.github}
                    onChange={(v) => setLink('github', v)}
                    error={errors['links.github']}
                  />
                  <LinkRow
                    icon={Briefcase}
                    placeholder="linkedin.com/in/username"
                    value={form.links.linkedin}
                    onChange={(v) => setLink('linkedin', v)}
                    error={errors['links.linkedin']}
                  />
                  <LinkRow
                    icon={Bird}
                    placeholder="twitter.com/username"
                    value={form.links.twitter}
                    onChange={(v) => setLink('twitter', v)}
                    error={errors['links.twitter']}
                  />
                </div>
              </div>
            </div>

            <footer className="pf-modal__foot">
              <button type="button" onClick={onClose} className="ac-btn">
                Cancel
              </button>
              <motion.button
                type="button"
                whileHover={submitting ? undefined : { scale: 1.03 }}
                whileTap={submitting ? undefined : { scale: 0.97 }}
                onClick={handleSave}
                disabled={submitting}
                className="ac-btn ac-btn-primary"
              >
                <Save size={14} /> {submitting ? 'Saving…' : 'Save changes'}
              </motion.button>
            </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
})

/* ───── Small helpers ──────────────────────────────────────────────────── */
function Field({ icon: Icon, label, error, hint, children }) {
  return (
    <div className="pf-field">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="pf-label"><Icon size={13} /> {label}</span>
        {hint && <span className="pf-count">{hint}</span>}
      </div>
      {children}
      {error && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--academic-danger)' }}>
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  )
}

function LinkRow({ icon: Icon, placeholder, value, onChange, error }) {
  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px',
          borderRadius: 12,
          background: 'var(--academic-surface)',
          border: `1px solid ${error ? 'var(--academic-danger)' : 'var(--academic-border)'}`,
        }}
      >
        <Icon size={14} style={{ color: 'var(--academic-text-muted)', flexShrink: 0 }} />
        <input
          className="pf-input"
          style={{ border: 'none', padding: '11px 0', background: 'transparent' }}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--academic-danger)', marginTop: 4 }}>
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  )
}
