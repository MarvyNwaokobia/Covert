import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'employer' | 'employee' | 'auditor'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:  'bg-employer text-white hover:bg-employer-dim border border-employer/30',
  secondary: 'bg-bg-elevated text-text-primary hover:bg-border-default border border-border-default',
  ghost:    'bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-transparent',
  danger:   'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30',
  employer: 'bg-employer/10 text-employer hover:bg-employer/20 border border-employer/30',
  employee: 'bg-employee/10 text-employee hover:bg-employee/20 border border-employee/30',
  auditor:  'bg-auditor/10 text-auditor hover:bg-auditor/20 border border-auditor/30',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-all duration-150 cursor-pointer
          disabled:opacity-40 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
