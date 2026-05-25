'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getAvailableDates, formatDate, formatDateISO } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'

export function DatePickerStrip() {
  const { pickupDate, setPickupDate } = useBooking()
  const dates = useMemo(() => getAvailableDates(14), [])

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.toDateString() === tomorrow.toDateString()
  }

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return 'Сегодня'
    if (isTomorrow(date)) return 'Завтра'
    return date.toLocaleDateString('ru-RU', { weekday: 'short' })
  }

  return (
    <div className="w-full">
      <h3 className="mb-4 font-display text-sm font-bold tracking-wider text-text-muted">
        ВЫБЕРИТЕ ДАТУ
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {dates.map((date) => {
          const dateStr = formatDateISO(date)
          const isSelected = pickupDate === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => setPickupDate(dateStr)}
              className={cn(
                'flex min-w-[72px] flex-col items-center rounded-2xl px-3 py-3 transition-all duration-200',
                isSelected
                  ? 'bg-accent-primary text-text-on-accent'
                  : 'bg-card text-text-on-card hover:bg-card/80'
              )}
            >
              <span className={cn(
                'text-xs font-medium',
                isSelected ? 'text-text-on-accent/70' : 'text-text-muted'
              )}>
                {getDayLabel(date)}
              </span>
              <span className="mt-1 text-xl font-bold tabular-nums">
                {date.getDate()}
              </span>
              <span className={cn(
                'text-xs',
                isSelected ? 'text-text-on-accent/70' : 'text-text-muted'
              )}>
                {date.toLocaleDateString('ru-RU', { month: 'short' })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
