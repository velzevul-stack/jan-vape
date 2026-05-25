'use client'

import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  disabled?: boolean
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'md',
  disabled = false,
}: StepperProps) {
  const canDecrement = value > min && !disabled
  const canIncrement = value < max && !disabled

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-elevated',
        size === 'sm' && 'p-0.5',
        size === 'md' && 'p-1'
      )}
    >
      <button
        type="button"
        onClick={() => canDecrement && onChange(value - 1)}
        disabled={!canDecrement}
        className={cn(
          'flex items-center justify-center rounded transition-all duration-150',
          'text-text-on-dark hover:bg-text-on-dark/10 active:scale-95',
          'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          size === 'sm' && 'h-7 w-7',
          size === 'md' && 'h-9 w-9'
        )}
        aria-label="Уменьшить"
      >
        <Minus className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      </button>

      <span
        className={cn(
          'min-w-[2rem] text-center font-bold tabular-nums text-text-on-dark',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base'
        )}
      >
        {value.toString().padStart(2, '0')}
      </span>

      <button
        type="button"
        onClick={() => canIncrement && onChange(value + 1)}
        disabled={!canIncrement}
        className={cn(
          'flex items-center justify-center rounded transition-all duration-150',
          'text-text-on-dark hover:bg-text-on-dark/10 active:scale-95',
          'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          size === 'sm' && 'h-7 w-7',
          size === 'md' && 'h-9 w-9'
        )}
        aria-label="Увеличить"
      >
        <Plus className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      </button>
    </div>
  )
}

// Compact version for product cards
interface CompactStepperProps {
  value: number
  onAdd: () => void
  onRemove: () => void
  max?: number
}

export function CompactStepper({ value, onAdd, onRemove, max = 99 }: CompactStepperProps) {
  if (value === 0) {
    return (
      <button
        onClick={onAdd}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary text-text-on-accent transition-all duration-150 hover:bg-accent-hover active:scale-95"
        aria-label="Добавить в корзину"
      >
        <Plus className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-accent-primary p-1">
      <button
        onClick={onRemove}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-text-on-accent/20 text-text-on-accent transition-all duration-150 hover:bg-text-on-accent/30 active:scale-95"
        aria-label="Уменьшить"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-text-on-accent">
        {value}
      </span>
      <button
        onClick={onAdd}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-text-on-accent/20 text-text-on-accent transition-all duration-150 hover:bg-text-on-accent/30 active:scale-95 disabled:opacity-50"
        aria-label="Увеличить"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
