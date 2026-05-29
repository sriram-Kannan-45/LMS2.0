import { motion } from 'framer-motion'
import { GraduationCap, ArrowRight } from 'lucide-react'

const initials = (name) =>
  name ? name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?'

/**
 * ProfileCourseProgress — Course progress dashboard widget (2026-05-28 v4).
 * Empty state shows grad-cap icon + "Browse courses" CTA; populated state
 * shows up to 4 courses with progress bars.
 */
export default function ProfileCourseProgress({ enrollments = [], onTabChange }) {
  const empty = enrollments.length === 0

  return (
    <section className="pf-cprog">
      <div className="pf-cprog__head">
        <div className="pf-cprog__title-block">
          <h3 className="pf-cprog__title">Course Progress</h3>
          {!empty && (
            <p className="pf-cprog__sub">
              {enrollments.length} active enrollment{enrollments.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {!empty && onTabChange && (
          <button
            type="button"
            onClick={() => onTabChange('myEnrollments')}
            className="pf-cprog__open"
          >
            Open
          </button>
        )}
      </div>

      {empty ? (
        <div className="pf-cprog__empty">
          <GraduationCap size={36} strokeWidth={1.6} aria-hidden />
          <p className="pf-cprog__empty-title">No active enrollments</p>
          <p className="pf-cprog__empty-sub">0 active enrollments</p>
          {onTabChange && (
            <button
              type="button"
              onClick={() => onTabChange('available')}
              className="pf-cprog__empty-cta"
            >
              Browse courses
              <ArrowRight size={13} strokeWidth={2.25} className="pf-cprog__arrow" aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <ul className="pf-cprog__list">
          {enrollments.slice(0, 4).map((e, i) => {
            const title = e.training?.title || e.title || 'Untitled course'
            const progress = Math.max(0, Math.min(100, Math.round(e.progress ?? 0)))
            return (
              <li key={e.id || title}>
                <div className="pf-cprog__row">
                  <span className="pf-cprog__avatar" aria-hidden>
                    {initials(title)}
                  </span>
                  <div className="pf-cprog__body">
                    <div className="pf-cprog__row-top">
                      <span className="pf-cprog__row-title" title={title}>{title}</span>
                      <span className="pf-cprog__row-pct mono">{progress}%</span>
                    </div>
                    <div className="pf-cprog__bar" aria-hidden>
                      <motion.div
                        className="pf-cprog__fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
