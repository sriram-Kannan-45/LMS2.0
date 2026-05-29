import { Sparkles, BookOpen, Trophy, MessageSquare } from 'lucide-react'

/**
 * ProfileQuickActions — 4 vertical action buttons.
 * First button is brand-light primary; others are ghost (white/border).
 */
const ACTIONS = [
  { icon: Sparkles,       label: 'Take a Quiz',         tab: 'ai-quizzes',  primary: true  },
  { icon: BookOpen,       label: 'Browse Courses',      tab: 'available',   primary: false },
  { icon: Trophy,         label: 'View Achievements',   tab: 'achievements',primary: false },
  { icon: MessageSquare,  label: 'Give Feedback',       tab: 'feedback',    primary: false },
]

export default function ProfileQuickActions({ onTabChange }) {
  return (
    <section className="pf-quick">
      <div className="pf-quick__head">
        <h3 className="pf-quick__title">Quick Actions</h3>
      </div>

      <div className="pf-quick__list">
        {ACTIONS.map(({ icon: Icon, label, tab, primary }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange?.(tab)}
            className={`pf-quick__btn ${primary ? 'pf-quick__btn--primary' : ''}`}
          >
            <Icon size={16} strokeWidth={2.25} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
