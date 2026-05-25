import { PickupLocation } from '../entities/PickupLocation'
import { BlockedSlot } from '../entities/BlockedSlot'
import { WebBooking } from '../entities/WebBooking'

export interface SlotInfo {
  time: string
  available: boolean
  reason?: 'busy' | 'blocked' | 'past'
}

const LEAD_TIME_MINUTES = 60

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { hour: h, minute: m }
}

export function generateSlots(
  date: string,
  location: PickupLocation,
  bookings: WebBooking[],
  blockedSlots: BlockedSlot[],
  nowOverride?: Date,
): SlotInfo[] {
  const now = nowOverride ?? new Date()
  const minAvailable = new Date(now.getTime() + LEAD_TIME_MINUTES * 60 * 1000)

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

    const slotStart = new Date(`${date}T${timeStr}:00`)
    const slotEnd = new Date(slotStart.getTime() + step * 60 * 1000)

    if (slotStart < minAvailable) {
      slots.push({ time: timeStr, available: false, reason: 'past' })
      continue
    }

    const isBlocked = blockedSlots.some((b) => {
      const bStart = new Date(b.startsAt)
      const bEnd = new Date(b.endsAt)
      return slotStart < bEnd && slotEnd > bStart
    })

    if (isBlocked) {
      slots.push({ time: timeStr, available: false, reason: 'blocked' })
      continue
    }

    const bookingsInSlot = bookings.filter((bk) => {
      const bkTime = new Date(bk.scheduledAt)
      return bkTime >= slotStart && bkTime < slotEnd
    }).length

    if (bookingsInSlot >= location.maxBookingsPerSlot) {
      slots.push({ time: timeStr, available: false, reason: 'busy' })
      continue
    }

    slots.push({ time: timeStr, available: true })
  }

  return slots
}
