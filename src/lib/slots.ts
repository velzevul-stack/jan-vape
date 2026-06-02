import { PickupLocation } from '../entities/PickupLocation'
import { BlockedSlot } from '../entities/BlockedSlot'
import { WebBooking } from '../entities/WebBooking'
import { storeSlotInstant } from '@/lib/dates'
import {
  isSlotTooSoon,
  slotConflictsWithDeliveries,
} from './deliveryBusyWindow'
import { isBlockedByInterval } from './blockedSlots'

export interface SlotInfo {
  time: string
  available: boolean
  bookingsCount: number
  reason?: 'past' | 'busy'
}

const NEAR_FUTURE_BLOCK_MINUTES = 10

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { hour: h, minute: m }
}

export function generatePickupSlots(
  date: string,
  location: PickupLocation,
  bookings: WebBooking[],
  blockedSlots: BlockedSlot[],
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

  for (let total = startTotal; total <= endTotal; total += step) {
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

    if (isBlockedByInterval(slotStart, slotEnd, blockedSlots)) {
      slots.push({ time: timeStr, available: false, bookingsCount, reason: 'busy' })
      continue
    }

    if (bookingsCount >= (location.maxBookingsPerSlot ?? 1)) {
      slots.push({ time: timeStr, available: false, bookingsCount, reason: 'busy' })
      continue
    }

    slots.push({ time: timeStr, available: true, bookingsCount })
  }

  return slots
}

export function generateDeliverySlots(
  date: string,
  location: PickupLocation,
  existingDeliveries: Array<{ scheduledAt: Date; roundTripMinutes: number }>,
  requestedRoundTripMinutes: number,
  blockedSlots: BlockedSlot[],
  nowOverride?: Date,
): SlotInfo[] {
  const now = nowOverride ?? new Date()

  const { hour: startHour, minute: startMinute } = parseTime(location.workDayStart)
  const { hour: endHour, minute: endMinute } = parseTime(location.workDayEnd)

  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute
  const step = location.slotStepMinutes || 5

  const slots: SlotInfo[] = []

  for (let total = startTotal; total <= endTotal; total += step) {
    const hour = Math.floor(total / 60)
    const minute = total % 60
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

    const slotStart = storeSlotInstant(date, timeStr)
    const slotEnd = new Date(slotStart.getTime() + step * 60 * 1000)

    if (isSlotTooSoon(slotStart, requestedRoundTripMinutes, now)) {
      slots.push({ time: timeStr, available: false, bookingsCount: 0, reason: 'past' })
      continue
    }

    if (isBlockedByInterval(slotStart, slotEnd, blockedSlots)) {
      slots.push({ time: timeStr, available: false, bookingsCount: 0, reason: 'busy' })
      continue
    }

    if (
      slotConflictsWithDeliveries(slotStart, requestedRoundTripMinutes, existingDeliveries)
    ) {
      slots.push({ time: timeStr, available: false, bookingsCount: 0, reason: 'busy' })
      continue
    }

    slots.push({ time: timeStr, available: true, bookingsCount: 0 })
  }

  return slots
}

export function generateSlots(
  date: string,
  location: PickupLocation,
  bookings: WebBooking[],
  blockedSlots: BlockedSlot[],
  nowOverride?: Date,
): SlotInfo[] {
  return generatePickupSlots(date, location, bookings, blockedSlots, nowOverride)
}
