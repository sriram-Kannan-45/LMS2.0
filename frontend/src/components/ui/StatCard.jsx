import Card from './Card'

const colorMap = {
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200/50 dark:border-violet-800/50', text: 'text-violet-600 dark:text-violet-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/50 dark:border-emerald-800/50', text: 'text-emerald-600 dark:text-emerald-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/50 dark:border-amber-800/50', text: 'text-amber-600 dark:text-amber-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200/50 dark:border-blue-800/50', text: 'text-blue-600 dark:text-blue-400' },
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendColor = 'success', // success | danger | warning
  variant = 'violet',
  className = '',
}) {
  const colors = colorMap[variant] || colorMap.violet

  return (
    <Card hover className={`stat-card--premium p-6 ${className}`}>
      <div className="stat-card__glow" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            {label}
          </span>
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 block tracking-tight">
            {value}
          </span>
          {trend && (
            <span className={`text-xs font-semibold ${
              trendColor === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
              trendColor === 'danger' ? 'text-rose-600 dark:text-rose-400' :
              'text-amber-600 dark:text-amber-400'
            }`}>
              {trend}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 flex-shrink-0 ${colors.bg} ${colors.border} ${colors.text}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </Card>
  )
}
