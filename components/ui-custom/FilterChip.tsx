import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  icon?: React.ReactNode
  count?: number
}

export function FilterChip({
  label,
  active = false,
  onClick,
  icon,
  count,
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-accent-primary text-text-on-accent'
          : 'bg-elevated text-text-on-dark hover:bg-elevated/80'
      )}
    >
      {icon && <span className="text-current">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums',
            active
              ? 'bg-text-on-accent/20 text-text-on-accent'
              : 'bg-text-on-dark/10 text-text-muted'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// Taste filter chip with icon
interface TasteChipProps {
  type: 'sweet' | 'sour' | 'cold'
  active?: boolean
  onClick?: () => void
}

const tasteIcons: Record<TasteChipProps['type'], string> = {
  sweet: '🍬',
  sour: '🍋',
  cold: '❄️',
}

const tasteLabels: Record<TasteChipProps['type'], string> = {
  sweet: 'Сладкий',
  sour: 'Кислый',
  cold: 'Холодный',
}

export function TasteChip({ type, active = false, onClick }: TasteChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
        active
          ? 'bg-accent-primary text-text-on-accent'
          : 'bg-card text-text-on-card hover:bg-card/80'
      )}
    >
      <span>{tasteIcons[type]}</span>
      <span>{tasteLabels[type]}</span>
    </button>
  )
}
