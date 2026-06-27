interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`inline-block border-2 border-border-default border-t-text-muted rounded-full animate-spin ${sizeMap[size]} ${className}`}
    />
  )
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`h-4 bg-bg-elevated rounded animate-pulse ${className}`} />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-bg-surface border border-border-subtle rounded-xl p-6 space-y-3 ${className}`}>
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-1/2" />
    </div>
  )
}
