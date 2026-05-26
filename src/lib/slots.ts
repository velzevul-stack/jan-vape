import { PickupLocation } from '../entities/PickupLocation'
import { BlockedSlot } from '../entities/BlockedSlot'
import { WebBooking } from '../entities/WebBooking'
import { storeSlotInstant } from '@/lib/dates'

export interface SlotInfo {
  time: string
  available: boolean
  bookingsCount: number
  reason?: 'past'
}

const NEAR_FUTURE_BLOCK_MINUTES = 10

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { hour: h, minute: m }
}

export function generateSlots(
  date: string,
  location: PickupLocation,
  bookings: WebBooking[],
  _blockedSlots: BlockedSlot[],
  nowOverride?: Date,
): SlotInfo[] {
  const now = nowOverride ?? new Date()
  const cutoff = new Date(now.getTime() + NEAR_FUTURE_BLOCK_MINUTES * 60 * 1000)

  const { hour: startHour, minute: startMinute } = parseTime(location.workDayStart)
  const { hour: endHour, minute: endMinute } = parseTime(location.workDayEnd)

  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute
  const step = location.slotStepMinutes || 5

  const slots: SlotInfo[] = []

  for (let total = startTotal; total < endTotal; total += step) {
    const hour = Math.floor(total / 60)
    const minute = total % 60
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

    const slotStart = storeSlotInstant(date, timeStr)
    const slotEnd = new Date(slotStart.getTime() + step * 60 * 1000)

    const bookingsCount = bookings.filter((bk) => {
      const bkTime = new Date(bk.scheduledAt)
      return bkTime >= slotStart && bkTime < slotEnd
    }).length

    if (slotStart < cutoff) {
      slots.push({ time: timeStr, available: false, bookingsCount, reason: 'past' })
      continue
    }

    slots.push({ time: timeStr, available: true, bookingsCount })
  }

  return slots
}
