export const STORE_TIMEZONE = 'Europe/Minsk'
export const STORE_UTC_OFFSET = '+03:00'
export const STORE_SLOT_START = '12:00'
export const STORE_SLOT_END = '23:00'

export function parseCalendarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatCalendarDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatCalendarDateDisplay(date: Date | string): string {
  const value =
    typeof date === 'string'
      ? parseCalendarDate(date)
      : date
  return value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: STORE_TIMEZONE,
  })
}

export function buildStoreDateTime(isoDate: string, time: string): Date {
  return new Date(`${isoDate}T${time}:00${STORE_UTC_OFFSET}`)
}

export function storeTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIMEZONE }).format(new Date())
}

export function storeDayBounds(isoDate: string): { start: Date; end: Date } {
  return {
    start: new Date(`${isoDate}T00:00:00${STORE_UTC_OFFSET}`),
    end: new Date(`${isoDate}T23:59:59.999${STORE_UTC_OFFSET}`),
  }
}

export function storeSlotInstant(isoDate: string, time: string): Date {
  return buildStoreDateTime(isoDate, time)
}
