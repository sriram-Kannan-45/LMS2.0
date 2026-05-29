import { motion } from 'framer-motion'
import {
  Calendar, Mail, Sparkles, Pencil,
  Globe, Code2, Briefcase, Bird,
} from 'lucide-react'
import ProfileAvatar from './ProfileAvatar'
import ProfileCompletion from './ProfileCompletion'
import { assetUrl } from '../../../api/api'

function fmtDate(d) {
  if (!d) return null
  try {
    const dt = new Date(d)
    if (isNaN(dt)) return null
    return dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  } catch { return null }
}

function normaliseUrl(u) {
  if (!u) return ''
  const v = u.trim()
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

const SOCIAL_DEFS = [
  { key: 'website',  icon: Globe,     label: 'Website'  },
  { key: 'github',   icon: Code2,     label: 'GitHub'   },
  { key: 'linkedin', icon: Briefcase, label: 'LinkedIn' },
  { key: 'twitter',  icon: Bird,      label: 'X'        },
]

/**
 * ProfileHero — Linear/Vercel SaaS spec (2026-05-28 v3).
 *
 * 3-zone identity card:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ✦ YOUR PROFILE                                                   │
 *   │ ┌──────┐  demo  [PARTICIPANT]              ┌─────╲   ┌─────────┐ │
 *   │ │ avt  │  ✉ demo@…  ·  📅 Joined Recently  │ 42% │   │ Edit ✎  │ │
 *   │ │  📷  │  [bio input field           ]     ╲─────╱   └─────────┘ │
 *   │ └──────┘  [Web] [GH] [LI] [Tw]                                   │
 *   │ [Upload]                                                         │
 *   └──────────────────────────────────────────────────────────────────┘
 */
export default function ProfileHero({
  user,
  profile,
  completion = 0,
  initials = 'U',
  onEdit,
  onAvatarChange,
  onAvatarClear,
}) {
  const displayName = profile?.displayName || user?.name || 'Participant'
  const email = user?.email
  const joined = fmtDate(user?.createdAt) || 'Recently'
  const role = (user?.role || 'PARTICIPANT').toUpperCase()

  const links = profile?.links || {}

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="pf-id-card"
    >
      {/* Top-left kicker */}
      <div className="pf-id-card__kicker">
        <Sparkles size={11} strokeWidth={2.5} aria-hidden />
        <span>Your profile</span>
      </div>

      <div className="pf-id-card__grid">
        {/* ── ZONE 1: Avatar ───────────────────────── */}
        <div className="pf-id-card__avatar-zone">
          <ProfileAvatar
            src={assetUrl(profile?.avatarUrl)}
            initials={initials}
            size={88}
            editable
            onChange={onAvatarChange}
            onClear={onAvatarClear}
            alt={`${displayName}'s photo`}
          />
        </div>

        {/* ── ZONE 2: Identity info ─────────────────── */}
        <div className="pf-id-card__info-zone">
          {/* Row 1: Name + role pill */}
          <div className="pf-id-card__name-row">
            <h1 className="pf-id-card__name">{displayName}</h1>
            <span className="pf-id-card__role-pill">{role}</span>
          </div>

          {/* Row 2: Email · Joined date */}
          <div className="pf-id-card__meta">
            {email && (
              <a href={`mailto:${email}`} className="pf-id-card__meta-item">
                <Mail size={13} strokeWidth={2.25} aria-hidden />
                {email}
              </a>
            )}
            {email && <span className="pf-id-card__meta-dot" aria-hidden>·</span>}
            <span className="pf-id-card__meta-item">
              <Calendar size={13} strokeWidth={2.25} aria-hidden />
              Joined {joined}
            </span>
          </div>

          {/* Row 4: Social links — always 4 chips (connected vs empty) */}
          <div className="pf-id-card__socials" aria-label="Social links">
            {SOCIAL_DEFS.map(({ key, icon: Icon, label }) => {
              const raw = links[key]
              const connected = !!(raw && raw.trim())
              const url = connected ? normaliseUrl(raw) : null
              return connected ? (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="pf-id-card__social pf-id-card__social--on"
                  title={`${label}: ${url}`}
                >
                  <Icon size={14} strokeWidth={2.25} aria-hidden />
                  <span>{label}</span>
                </a>
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={onEdit}
                  className="pf-id-card__social"
                  title={`Add ${label}`}
                >
                  <Icon size={14} strokeWidth={2.25} aria-hidden />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── ZONE 3: Completion ring + Edit ─────────── */}
        <div className="pf-id-card__action-zone">
          <ProfileCompletion value={completion} size={92} stroke={6} />
          <button
            type="button"
            onClick={onEdit}
            className="pf-id-card__edit-btn"
          >
            <Pencil size={14} strokeWidth={2.25} aria-hidden />
            Edit profile
          </button>
        </div>
      </div>
    </motion.section>
  )
}
