import { Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CashOnlyNotice({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-accent-primary/30 bg-accent-mist text-center',
        compact ? 'px-3 py-2.5' : 'p-4',
        className,
      )}
    >
      {!compact && (
        <div className="mb-2 flex justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/20 text-accent-soft">
            <Banknote className="h-5 w-5" />
          </span>
        </div>
      )}
      <p
        className={cn(
          'text-text-on-dark',
          compact ? 'text-xs leading-snug' : 'text-sm leading-relaxed md:text-base',
        )}
      >
        Оплата только{' '}
        <span className="font-bold text-accent-soft">наличными</span>
        {' '}при получении
      </p>
    </div>
  )
}
