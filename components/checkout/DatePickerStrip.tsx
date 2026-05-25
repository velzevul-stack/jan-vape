'use client'

import { useMemo, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAvailableDates, formatDateISO } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'

export function DatePickerStrip() {
  const { pickupDate, setPickupDate } = useBooking()
  const dates = useMemo(() => getAvailableDates(14), [])
  const stripRef = useRef<HTMLDivElement | null>(null)

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.toDateString() === tomorrow.toDateString()
  }

  const isWeekend = (date: Date) => {
    const d = date.getDay()
    return d === 0 || d === 6
  }

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return 'Сегодня'
    if (isTomorrow(date)) return 'Завтра'
    return date.toLocaleDateString('ru-RU', { weekday: 'short' })
  }

  useEffect(() => {
    if (!pickupDate || !stripRef.current) return
    const node = stripRef.current.querySelector<HTMLButtonElement>(`[data-date="${pickupDate}"]`)
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [pickupDate])

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
          <Calendar className="h-3.5 w-3.5 text-accent-primary" />
          ВЫБЕРИТЕ ДАТУ
        </h3>
        <span className="text-xs text-text-faint">14 дней вперёд</span>
      </div>
      <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {dates.map((date) => {
          const dateStr = formatDateISO(date)
          const isSelected = pickupDate === dateStr
          const weekend = isWeekend(date)

          return (
            <button
              key={dateStr}
              data-date={dateStr}
              onClick={() => setPickupDate(dateStr)}
              className={cn(
                'group/date relative flex min-w-[76px] flex-col items-center rounded-2xl border px-3 py-3 transition-all duration-200',
                isSelected
                  ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30'
                  : 'border-border-on-dark bg-elevated text-text-on-dark hover:-translate-y-0.5 hover:border-accent-primary/40 hover:bg-card-inner',
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider',
                  isSelected
                    ? 'text-text-on-accent/70'
                    : weekend
                      ? 'text-status-warning'
                      : 'text-text-muted',
                )}
              >
                {getDayLabel(date)}
              </span>
              <span className="mt-1 font-display text-2xl font-extrabold leading-none tabular-nums">
                {date.getDate()}
              </span>
              <span
                className={cn(
                  'mt-1 text-[10px] uppercase tracking-wider',
                  isSelected ? 'text-text-on-accent/70' : 'text-text-faint',
                )}
              >
                {date.toLocaleDateString('ru-RU', { month: 'short' })}
              </span>
              {isSelected && (
                <span className="pointer-events-none absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-text-on-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
