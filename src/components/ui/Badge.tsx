type BadgeVariant = 'employer' | 'employee' | 'auditor' | 'default' | 'success' | 'warning' | 'error'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const badgeClasses: Record<BadgeVariant, string> = {
  default:  'bg-border-subtle text-text-muted',
  employer: 'bg-employer/15 text-employer border border-employer/25',
  employee: 'bg-employee/15 text-employee border border-employee/25',
  auditor:  'bg-auditor/15 text-auditor border border-auditor/25',
  success:  'bg-green-500/15 text-green-400 border border-green-500/25',
  warning:  'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
  error:    'bg-red-500/15 text-red-400 border border-red-500/25',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${badgeClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
