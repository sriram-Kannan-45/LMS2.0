const colorMap = {
  primary: 'badge-primary',
  success: 'badge-green',
  warning: 'badge-yellow',
  danger: 'badge-red',
  info: 'badge-blue',
  neutral: 'badge-gray',
}

export default function Badge({ children, color = 'primary', className = '', ...props }) {
  const cls = [colorMap[color] || 'badge-primary', className].filter(Boolean).join(' ')
  return (
    <span className={cls} {...props}>
      {children}
    </span>
  )
}
