interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'employer' | 'employee' | 'auditor'
}

const glowClasses = {
  employer: 'shadow-employer/10 shadow-lg ring-1 ring-employer/20',
  employee: 'shadow-employee/10 shadow-lg ring-1 ring-employee/20',
  auditor:  'shadow-auditor/10 shadow-lg ring-1 ring-auditor/20',
}

export function Card({ children, className = '', glow }: CardProps) {
  return (
    <div
      className={`
        bg-bg-surface border border-border-subtle rounded-xl p-6
        ${glow ? glowClasses[glow] : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-4 pb-4 border-b border-border-subtle ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-lg font-semibold text-text-primary ${className}`}>
      {children}
    </h2>
  )
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`mt-1 text-sm text-text-muted ${className}`}>
      {children}
    </p>
  )
}
