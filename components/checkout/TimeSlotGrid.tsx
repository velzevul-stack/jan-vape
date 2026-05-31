'use client'

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Sunrise, Sun, Moon, Clock, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { useSlots } from '@/lib/api/hooks/useSlots'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

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

const COLLAPSED_SLOT_LIMIT = 8

const SLOT_GRID_CLASS =
  'grid w-full grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] sm:gap-2'

function getPeriod(time: string): Period {
  const hour = parseInt(time.split(':')[0] ?? '0', 10)
  if (hour < 12) return 'morning'
  if (hour < 17) return 'day'
  return 'evening'
}

function availableSlotsInPeriod(slotsByPeriod: Record<Period, TimeSlot[]>, periodId: Period) {
  return slotsByPeriod[periodId].filter((slot) => slot.available)
}

function buildCollapsedPreview(
  visiblePeriods: PeriodConfig[],
  slotsByPeriod: Record<Period, TimeSlot[]>,
  pickupTime: string | null,
) {
  if (visiblePeriods.length === 0) {
    return {
      focusPeriod: PERIODS[0],
      previewSlots: [] as TimeSlot[],
      totalAvailable: 0,
      hiddenCount: 0,
      hasMore: false,
    }
  }

  const totalAvailable = visiblePeriods.reduce(
    (sum, period) => sum + availableSlotsInPeriod(slotsByPeriod, period.id).length,
    0,
  )

  let focusPeriod = visiblePeriods[0]!
  if (pickupTime) {
    const withSelected = visiblePeriods.find((period) =>
      availableSlotsInPeriod(slotsByPeriod, period.id).some((slot) => slot.time === pickupTime),
    )
    if (withSelected) focusPeriod = withSelected
  }

  const periodSlots = availableSlotsInPeriod(slotsByPeriod, focusPeriod.id)
  const previewSlots: TimeSlot[] = []
  const seen = new Set<string>()

  if (pickupTime) {
    const selected = periodSlots.find((slot) => slot.time === pickupTime)
    if (selected) {
      previewSlots.push(selected)
      seen.add(selected.time)
    }
  }

  for (const slot of periodSlots) {
    if (previewSlots.length >= COLLAPSED_SLOT_LIMIT) break
    if (seen.has(slot.time)) continue
    previewSlots.push(slot)
    seen.add(slot.time)
  }

  const hiddenCount = totalAvailable - previewSlots.length
  const hasMore =
    hiddenCount > 0 ||
    visiblePeriods.length > 1 ||
    periodSlots.length > previewSlots.length

  return {
    focusPeriod,
    previewSlots,
    totalAvailable,
    hiddenCount: Math.max(0, hiddenCount),
    hasMore,
  }
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
        'relative flex h-11 w-full min-w-0 items-center justify-center rounded-xl border text-[13px] font-semibold tabular-nums transition-all duration-200 sm:h-12 sm:text-sm',
        selected
          ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30'
          : isPast
            ? 'cursor-not-allowed border-transparent bg-card-inner/30 text-text-faint opacity-40'
            : hasBookings
              ? 'border-accent-primary/30 bg-accent-mist/40 text-text-on-dark hover:-translate-y-0.5 hover:border-accent-primary/50 hover:bg-accent-mist/55 hover:shadow-md hover:shadow-accent-primary/10'
              : 'border-border-on-dark bg-gradient-to-b from-elevated to-card-inner text-text-on-dark hover:-translate-y-0.5 hover:border-accent-primary/40 hover:from-card-inner hover:to-elevated hover:shadow-md hover:shadow-black/20',
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

function PeriodHeader({ period, count }: { period: PeriodConfig; count: number }) {
  return (
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
      <span className="text-xs text-text-faint">{count}</span>
    </header>
  )
}

function SlotLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border-on-dark pt-4 text-xs text-text-muted',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-md border border-border-on-dark bg-gradient-to-b from-elevated to-card-inner" />
        Доступно
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-md border border-accent-primary bg-accent-primary shadow-sm shadow-accent-primary/30" />
        Выбрано
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="relative h-3 w-5 rounded-md border border-accent-primary/30 bg-accent-mist/40">
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-primary" />
        </span>
        Есть бронь
      </span>
    </div>
  )
}

function PeriodSections({
  visiblePeriods,
  slotsByPeriod,
  pickupTime,
  onSelect,
  selectedRef,
}: {
  visiblePeriods: PeriodConfig[]
  slotsByPeriod: Record<Period, TimeSlot[]>
  pickupTime: string | null
  onSelect: (time: string) => void
  selectedRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="space-y-5">
      {visiblePeriods.map((period) => {
        const periodSlots = availableSlotsInPeriod(slotsByPeriod, period.id)
        if (periodSlots.length === 0) return null

        return (
          <section key={period.id} className="space-y-3">
            <PeriodHeader period={period} count={periodSlots.length} />
            <div className={SLOT_GRID_CLASS}>
              {periodSlots.map((slot) => (
                <div key={slot.time} ref={slot.time === pickupTime ? selectedRef : undefined}>
                  <SlotButton
                    slot={slot}
                    selected={slot.time === pickupTime}
                    onSelect={() => onSelect(slot.time)}
                  />
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function TimeSlotGrid() {
  const {
    pickupLocationId,
    zoneForSlots,
    fullDeliveryAddress,
    pickupDate,
    pickupTime,
    setPickupTime,
    isDeliveryDraft,
  } = useBooking()

  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetSelectedRef = useRef<HTMLDivElement | null>(null)

  const { slots, isLoading, error } = useSlots({
    locationId: pickupLocationId ?? undefined,
    deliveryZoneId: zoneForSlots?.id,
    customAddress: isDeliveryDraft ? fullDeliveryAddress : undefined,
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

  const collapsed = useMemo(() => {
    if (visiblePeriods.length === 0) return null
    return buildCollapsedPreview(visiblePeriods, slotsByPeriod, pickupTime)
  }, [visiblePeriods, slotsByPeriod, pickupTime])

  useEffect(() => {
    if (!pickupTime || slots.length === 0) return
    const selected = slots.find((slot) => slot.time === pickupTime)
    if (!selected?.available) {
      setPickupTime(null)
    }
  }, [slots, pickupTime, setPickupTime])

  useEffect(() => {
    if (!sheetOpen || !pickupTime || !sheetSelectedRef.current) return
    sheetSelectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [sheetOpen, pickupTime])

  const handleSelect = useCallback(
    (time: string, closeSheet = false) => {
      setPickupTime(time)
      if (closeSheet) setSheetOpen(false)
    },
    [setPickupTime],
  )

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
          {Array.from({ length: 8 }).map((_, i) => (
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

  if (slots.length === 0 || visiblePeriods.length === 0 || collapsed == null) {
    return (
      <PromptState
        icon={<AlertCircle className="h-5 w-5 text-status-warning" />}
        text="Нет доступных слотов на выбранную дату"
      />
    )
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-xs font-bold tracking-[0.22em] text-text-faint">
          ВЫБЕРИТЕ ВРЕМЯ
        </h3>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-on-dark bg-elevated px-3 py-1 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
          Свободно:{' '}
          <span className="font-bold tabular-nums text-text-on-dark">{collapsed.totalAvailable}</span>
        </span>
      </div>

      <div className="surface-card rounded-3xl p-4 sm:p-5">
        <section className="space-y-3">
          <PeriodHeader
            period={collapsed.focusPeriod}
            count={availableSlotsInPeriod(slotsByPeriod, collapsed.focusPeriod.id).length}
          />
          <div className={SLOT_GRID_CLASS}>
            {collapsed.previewSlots.map((slot) => (
              <div key={slot.time}>
                <SlotButton
                  slot={slot}
                  selected={slot.time === pickupTime}
                  onSelect={() => handleSelect(slot.time)}
                />
              </div>
            ))}
          </div>
        </section>

        {collapsed.hasMore && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border-on-dark',
              'bg-card-inner px-4 py-3.5 text-sm font-semibold text-text-on-dark transition-all duration-200',
              'hover:border-accent-primary/40 hover:bg-accent-mist/30 hover:text-accent-soft',
            )}
          >
            <span>
              Показать все слоты
              {collapsed.hiddenCount > 0 && (
                <span className="ml-1.5 font-normal text-text-muted">
                  (+{collapsed.hiddenCount})
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </button>
        )}
      </div>

      {pickupTime && (
        <div className="animate-float-up mt-4 inline-flex items-center gap-3 rounded-2xl bg-accent-primary/20 px-4 py-3 text-sm text-accent-soft">
          <Clock className="h-4 w-4" />
          <span>
            Выбрано: <strong className="tabular-nums text-text-on-dark">{pickupTime}</strong>
          </span>
          {collapsed.hasMore && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="ml-1 text-xs underline underline-offset-2 hover:text-accent-primary"
            >
              изменить
            </button>
          )}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="max-h-[min(88vh,36rem)] gap-0 rounded-t-3xl border-t-border-on-dark bg-canvas p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="border-b border-border-on-dark px-5 py-4">
            <SheetTitle className="font-display text-base font-bold tracking-wider text-text-on-dark">
              Все слоты
            </SheetTitle>
            <p className="mt-1 text-sm text-text-muted">
              Свободно: {collapsed.totalAvailable}
              {pickupTime && (
                <>
                  {' · '}
                  выбрано{' '}
                  <span className="font-semibold tabular-nums text-text-on-dark">{pickupTime}</span>
                </>
              )}
            </p>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 py-4 scrollbar-slim">
            <PeriodSections
              visiblePeriods={visiblePeriods}
              slotsByPeriod={slotsByPeriod}
              pickupTime={pickupTime}
              onSelect={(time) => handleSelect(time, true)}
              selectedRef={sheetSelectedRef}
            />
            <SlotLegend className="mt-4" />
          </div>
        </SheetContent>
      </Sheet>
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
