'use client'

import { useMemo, useRef, useEffect } from 'react'
import { Sunrise, Sun, Moon, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { useSlots } from '@/lib/api/hooks/useSlots'

type Period = 'morning' | 'day' | 'evening'

interface PeriodConfig {
  id: Period
  label: string
  icon: React.ReactNode
  from: number
  to: number
}

const PERIODS: PeriodConfig[] = [
  { id: 'morning', label: 'Утро', icon: <Sunrise className="h-4 w-4" />, from: 0, to: 12 },
  { id: 'day', label: 'День', icon: <Sun className="h-4 w-4" />, from: 12, to: 17 },
  { id: 'evening', label: 'Вечер', icon: <Moon className="h-4 w-4" />, from: 17, to: 24 },
]

function getPeriod(time: string): Period {
  const hour = parseInt(time.split(':')[0] ?? '0', 10)
  if (hour < 12) return 'morning'
  if (hour < 17) return 'day'
  return 'evening'
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: TimeSlot
  selected: boolean
  onSelect: () => void
}) {
  const isPast = slot.reason === 'past'
  const isDisabled = !slot.available
  const hasBookings = (slot.bookingsCount ?? 0) > 0
  const tooltip = isPast
    ? 'Время уже прошло или слишком близко'
    : hasBookings
      ? `Уже есть бронь(и) на это время — продавец подтвердит вручную`
      : 'Время доступно'

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onSelect()}
      disabled={isDisabled}
      title={tooltip}
      data-selected={selected || undefined}
      className={cn(
        'group/slot relative flex h-12 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-all duration-200',
        selected
          ? 'scale-[1.04] bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/40 ring-1 ring-accent-soft'
          : isPast
            ? 'cursor-not-allowed bg-card-inner/40 text-text-faint opacity-40'
            : hasBookings
              ? 'bg-accent-mist text-accent-soft ring-1 ring-accent-primary/40 hover:-translate-y-px hover:bg-accent-primary/15'
              : 'bg-card-inner text-text-on-dark hover:-translate-y-px hover:bg-accent-mist hover:text-accent-soft hover:shadow-md hover:shadow-accent-primary/15',
      )}
    >
      <span>{slot.time}</span>
      {hasBookings && !isPast && !selected && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold tabular-nums text-text-on-accent shadow">
          {slot.bookingsCount}
        </span>
      )}
      {selected && (
        <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-accent-soft/60" />
      )}
    </button>
  )
}

function SlotLegend() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border-on-dark pt-4 text-xs text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-card-inner" />
        Доступно
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-accent-primary" />
        Выбрано
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-accent-mist ring-1 ring-accent-primary/40" />
        Уже есть бронь (но можно выбрать)
      </span>
      <span className="inline-flex items-center gap-1.5 opacity-60">
        <span className="h-3 w-3 rounded bg-card-inner" />
        Прошло
      </span>
    </div>
  )
}

export function TimeSlotGrid() {
  const { pickupLocationId, customAddressText, pickupDate, pickupTime, setPickupTime } = useBooking()

  const { slots, isLoading, error } = useSlots({
    locationId: pickupLocationId ?? undefined,
    customAddress: customAddressText ?? undefined,
    date: pickupDate ?? undefined,
    enabled: !!pickupDate && (!!pickupLocationId || !!customAddressText),
  })

  const slotsByPeriod = useMemo(() => {
    const groups: Record<Period, TimeSlot[]> = { morning: [], day: [], evening: [] }
    slots.forEach((slot) => {
      groups[getPeriod(slot.time)].push(slot)
    })
    return groups
  }, [slots])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectedRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!pickupTime || !selectedRef.current) return
    selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [pickupTime])

  if (!pickupDate) {
    return (
      <PromptState icon={<Clock className="h-5 w-5" />} text="Сначала выберите дату" />
    )
  }

  if (!pickupLocationId && !customAddressText) {
    return (
      <PromptState
        icon={<AlertCircle className="h-5 w-5" />}
        text="Выберите место получения"
      />
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border-on-dark bg-elevated p-5">
        <div className="grid grid-cols-3 gap-4">
          {PERIODS.map((p) => (
            <div key={p.id} className="space-y-2">
              <div className="h-4 w-16 shimmer rounded" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 shimmer rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <PromptState
        icon={<AlertCircle className="h-5 w-5 text-status-warning" />}
        text="Ошибка загрузки слотов. Попробуйте обновить страницу."
      />
    )
  }

  if (slots.length === 0) {
    return (
      <PromptState
        icon={<AlertCircle className="h-5 w-5 text-status-warning" />}
        text="Нет доступных слотов на выбранную дату"
      />
    )
  }

  const availableCount = slots.filter((s) => s.available).length

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-xs font-bold tracking-[0.22em] text-text-faint">
          ВЫБЕРИТЕ ВРЕМЯ
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-on-dark bg-elevated px-3 py-1 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
          Свободно: <span className="font-bold tabular-nums text-text-on-dark">{availableCount}</span>
        </span>
      </div>

      <div
        ref={containerRef}
        className="surface-card overflow-hidden rounded-3xl"
      >
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto scrollbar-slim p-4 sm:p-5">
          <div className="space-y-5">
            {PERIODS.map((period) => {
              const periodSlots = slotsByPeriod[period.id]
              if (periodSlots.length === 0) return null
              const hasAnyAvailable = periodSlots.some((s) => s.available)

              return (
                <section key={period.id} className="space-y-3">
                  <header className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-display text-sm font-bold tracking-wider text-text-on-dark">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full',
                          period.id === 'morning' && 'bg-amber-300/20 text-amber-300',
                          period.id === 'day' && 'bg-orange-300/20 text-orange-300',
                          period.id === 'evening' && 'bg-indigo-300/20 text-indigo-300',
                        )}
                      >
                        {period.icon}
                      </span>
                      {period.label}
                    </h4>
                    <span className="text-xs text-text-faint">
                      {periodSlots.filter((s) => s.available).length} / {periodSlots.length}
                    </span>
                  </header>

                  {hasAnyAvailable ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {periodSlots.map((slot) => (
                        <div
                          key={slot.time}
                          ref={slot.time === pickupTime ? selectedRef : undefined}
                        >
                          <SlotButton
                            slot={slot}
                            selected={slot.time === pickupTime}
                            onSelect={() => setPickupTime(slot.time)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-card-inner/40 px-4 py-3 text-center text-xs text-text-faint">
                      В этом периоде нет доступного времени
                    </div>
                  )}
                </section>
              )
            })}
          </div>
          <SlotLegend />
        </div>
      </div>

      {pickupTime && (
        <div className="animate-float-up mt-4 inline-flex items-center gap-3 rounded-2xl border border-accent-primary/30 bg-accent-mist px-4 py-3 text-sm text-accent-soft">
          <Clock className="h-4 w-4" />
          <span>
            Выбрано: <strong className="text-text-on-dark tabular-nums">{pickupTime}</strong>
          </span>
        </div>
      )}
    </div>
  )
}

function PromptState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="surface-card flex items-center gap-3 rounded-2xl px-5 py-5 text-text-muted">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card-inner text-accent-primary">
        {icon}
      </span>
      <p className="text-sm">{text}</p>
    </div>
  )
}
