'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { useSlots } from '@/lib/api/hooks/useSlots'

function SlotButton({
  slot,
  selected,
  onSelect,
  label,
  className,
}: {
  slot: TimeSlot
  selected: boolean
  onSelect: () => void
  label: string
  className?: string
}) {
  const isDisabled = !slot.available
  return (
    <button
      type="button"
      onClick={() => !isDisabled && onSelect()}
      disabled={isDisabled}
      title={slot.reason === 'busy' ? 'Занято' : slot.reason === 'blocked' ? 'Недоступно' : slot.reason === 'past' ? 'Прошлое время' : undefined}
      className={cn(
        'flex items-center justify-center rounded-xl font-bold transition-all duration-200',
        className,
        selected
          ? 'scale-105 bg-accent-primary text-text-on-accent shadow-lg'
          : slot.reason === 'busy'
            ? 'cursor-not-allowed bg-card-inner/50 text-text-muted/40 line-through'
            : slot.reason === 'blocked'
              ? 'cursor-not-allowed bg-card-inner/30 text-text-muted/30'
              : slot.reason === 'past'
                ? 'cursor-not-allowed opacity-30'
                : 'bg-card-inner text-text-on-dark hover:bg-accent-primary/20 hover:text-accent-primary',
      )}
    >
      {label}
    </button>
  )
}

function SlotLegend() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-border-subtle pt-4 sm:gap-6">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <div className="h-4 w-4 rounded bg-card-inner" />
        <span>Доступно</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <div className="h-4 w-4 rounded bg-accent-primary" />
        <span>Выбрано</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <div className="h-4 w-4 rounded bg-card-inner/50" />
        <span>Занято</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <div className="h-4 w-4 rounded opacity-30 bg-card-inner" />
        <span>Прошло</span>
      </div>
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

  const slotsByHour = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {}
    slots.forEach((slot) => {
      const hour = slot.time.split(':')[0]
      if (!grouped[hour]) grouped[hour] = []
      grouped[hour].push(slot)
    })
    return grouped
  }, [slots])

  if (!pickupDate) {
    return (
      <div className="rounded-2xl bg-elevated p-6 text-center">
        <p className="text-text-muted">Сначала выберите дату</p>
      </div>
    )
  }

  if (!pickupLocationId && !customAddressText) {
    return (
      <div className="rounded-2xl bg-elevated p-6 text-center">
        <p className="text-text-muted">Выберите место получения</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-3xl bg-card p-4">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-11 rounded-xl bg-elevated" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-elevated p-6 text-center">
        <p className="text-text-muted">Ошибка загрузки слотов. Попробуйте обновить страницу.</p>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl bg-elevated p-6 text-center">
        <p className="text-text-muted">Нет доступных слотов на выбранную дату</p>
      </div>
    )
  }

  const availableCount = slots.filter((s) => s.available).length

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold tracking-wider text-text-muted">
          ВЫБЕРИТЕ ВРЕМЯ
        </h3>
        <span className="text-xs text-text-muted">Доступно: {availableCount}</span>
      </div>

      <div className="rounded-3xl bg-card p-4">
        <div className="max-h-[min(50vh,22rem)] overflow-y-auto lg:hidden">
          <div className="grid grid-cols-4 gap-1.5">
            {slots.map((slot) => (
              <SlotButton
                key={slot.time}
                slot={slot}
                selected={slot.time === pickupTime}
                onSelect={() => setPickupTime(slot.time)}
                label={slot.time}
                className="h-10 min-w-0 px-0.5 text-[11px] tabular-nums"
              />
            ))}
          </div>
          <SlotLegend />
        </div>

        <div className="hidden lg:block">
          <div className="space-y-2">
            {Object.entries(slotsByHour).map(([hour, hourSlots]) => (
              <div key={hour} className="flex items-center gap-3">
                <div className="w-12 shrink-0 text-right text-sm font-medium text-text-muted">
                  {hour}:00
                </div>
                <div className="flex flex-wrap gap-1">
                  {hourSlots.map((slot) => (
                    <SlotButton
                      key={slot.time}
                      slot={slot}
                      selected={slot.time === pickupTime}
                      onSelect={() => setPickupTime(slot.time)}
                      label={slot.time.split(':')[1]}
                      className="h-9 w-10 text-xs tabular-nums"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <SlotLegend />
        </div>
      </div>

      {pickupTime && (
        <div className="mt-4 rounded-xl bg-accent-primary/10 p-3 text-center">
          <span className="text-sm text-accent-primary">
            Выбрано время: <strong>{pickupTime}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
