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
}

const PERIODS: PeriodConfig[] = [
  { id: 'morning', label: 'Утро', icon: <Sunrise className="h-4 w-4" /> },
  { id: 'day', label: 'День', icon: <Sun className="h-4 w-4" /> },
  { id: 'evening', label: 'Вечер', icon: <Moon className="h-4 w-4" /> },
]

const SLOT_GRID_CLASS =
  'grid w-full grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] sm:gap-2'

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

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onSelect()}
      disabled={isDisabled}
      className={cn(
        'relative flex h-11 w-full min-w-0 items-center justify-center rounded-xl text-[13px] font-semibold tabular-nums transition-colors sm:h-12 sm:text-sm',
        selected
          ? 'bg-accent-primary/35 text-accent-soft'
          : isPast
            ? 'cursor-not-allowed bg-card-inner/40 text-text-faint opacity-40'
            : hasBookings
              ? 'bg-card-inner text-text-on-dark hover:bg-accent-mist/40'
              : 'bg-card-inner text-text-on-dark hover:bg-elevated',
      )}
    >
      <span>{slot.time}</span>
      {hasBookings && !isPast && !selected && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[9px] font-bold tabular-nums text-text-on-accent">
          {slot.bookingsCount}
        </span>
      )}
    </button>
  )
}

function SlotLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border-on-dark pt-4 text-xs text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-md bg-card-inner" />
        Доступно
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-md bg-accent-primary/35" />
        Выбрано
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="relative h-3 w-5 rounded-md bg-card-inner">
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-primary" />
        </span>
        Есть бронь
      </span>
    </div>
  )
}

export function TimeSlotGrid() {
  const {
    pickupLocationId,
    zoneForSlots,
    addressDraft,
    pickupDate,
    pickupTime,
    setPickupTime,
    isDeliveryDraft,
  } = useBooking()

  const { slots, isLoading, error } = useSlots({
    locationId: pickupLocationId ?? undefined,
    deliveryZoneId: zoneForSlots?.id,
    customAddress: isDeliveryDraft ? addressDraft : undefined,
    date: pickupDate ?? undefined,
    enabled: !!pickupDate && (!!pickupLocationId || !!zoneForSlots?.id),
  })

  const slotsByPeriod = useMemo(() => {
    const groups: Record<Period, TimeSlot[]> = { morning: [], day: [], evening: [] }
    slots.forEach((slot) => {
      groups[getPeriod(slot.time)].push(slot)
    })
    return groups
  }, [slots])

  const visiblePeriods = useMemo(
    () => PERIODS.filter((period) => slotsByPeriod[period.id].some((slot) => slot.available)),
    [slotsByPeriod],
  )

  useEffect(() => {
    if (!pickupTime || slots.length === 0) return
    const selected = slots.find((slot) => slot.time === pickupTime)
    if (!selected?.available) {
      setPickupTime(null)
    }
  }, [slots, pickupTime, setPickupTime])

  const selectedRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!pickupTime || !selectedRef.current) return
    selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [pickupTime])

  if (!pickupDate) {
    return (
      <PromptState icon={<Clock className="h-5 w-5" />} text="Сначала выберите дату" />
    )
  }

  if (!pickupLocationId && !zoneForSlots) {
    return (
      <PromptState
        icon={<AlertCircle className="h-5 w-5" />}
        text={isDeliveryDraft ? 'Уточните адрес или выберите населённый пункт' : 'Выберите место получения'}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border-on-dark bg-elevated p-5">
        <div className={SLOT_GRID_CLASS}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-11 shimmer rounded-xl sm:h-12" />
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

  if (slots.length === 0 || visiblePeriods.length === 0) {
    return (
      <PromptState
        icon={<AlertCircle className="h-5 w-5 text-status-warning" />}
        text="Нет доступных слотов на выбранную дату"
      />
    )
  }

  const availableCount = slots.filter((s) => s.available).length

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-xs font-bold tracking-[0.22em] text-text-faint">
          ВЫБЕРИТЕ ВРЕМЯ
        </h3>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-on-dark bg-elevated px-3 py-1 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
          Свободно: <span className="font-bold tabular-nums text-text-on-dark">{availableCount}</span>
        </span>
      </div>

      <div className="surface-card overflow-hidden rounded-3xl">
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto scrollbar-slim p-4 sm:p-5">
          <div className="space-y-5">
            {visiblePeriods.map((period) => {
              const periodSlots = slotsByPeriod[period.id].filter((slot) => slot.available)
              if (periodSlots.length === 0) return null

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
                    <span className="text-xs text-text-faint">{periodSlots.length}</span>
                  </header>

                  <div className={SLOT_GRID_CLASS}>
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
                </section>
              )
            })}
          </div>
          <SlotLegend />
        </div>
      </div>

      {pickupTime && (
        <div className="animate-float-up mt-4 inline-flex items-center gap-3 rounded-2xl bg-accent-primary/20 px-4 py-3 text-sm text-accent-soft">
          <Clock className="h-4 w-4" />
          <span>
            Выбрано: <strong className="tabular-nums text-text-on-dark">{pickupTime}</strong>
          </span>
        </div>
      )}
    </div>
  )
}

function PromptState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="surface-card flex items-center gap-3 rounded-2xl px-5 py-5 text-text-muted">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-inner text-accent-primary">
        {icon}
      </span>
      <p className="text-sm">{text}</p>
    </div>
  )
}
