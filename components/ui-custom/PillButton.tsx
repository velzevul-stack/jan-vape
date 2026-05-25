import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  showArrow?: boolean
  fullWidth?: boolean
}

export function PillButton({
  children,
  variant = 'primary',
  size = 'md',
  showArrow = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: PillButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-display text-sm font-bold uppercase tracking-wider transition-all duration-200',
        // Variants
        variant === 'primary' && [
          'bg-accent-primary text-text-on-accent',
          'hover:bg-accent-hover active:scale-[0.98]',
          'disabled:bg-status-disabled disabled:text-text-muted disabled:cursor-not-allowed',
        ],
        variant === 'secondary' && [
          'bg-elevated text-text-on-dark',
          'hover:bg-elevated/80 active:scale-[0.98]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ],
        variant === 'outline' && [
          'bg-transparent text-text-on-dark border-2 border-text-on-dark/20',
          'hover:border-accent-primary hover:text-accent-primary active:scale-[0.98]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ],
        // Sizes
        size === 'sm' && 'h-9 px-4 text-xs',
        size === 'md' && 'h-12 px-6 text-sm',
        size === 'lg' && 'h-14 px-8 text-base',
        // Full width
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled}
      {...props}
    >
      <span>{children}</span>
      {showArrow && <ArrowRight className="h-4 w-4" />}
    </button>
  )
}
