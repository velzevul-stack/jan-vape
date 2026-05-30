import { slotConflictsWithDeliveries } from './deliveryBusyWindow'

export function assertDeliverySlotAvailable(
  scheduledAt: Date,
  roundTripMinutes: number,
  existing: Array<{ scheduledAt: Date; roundTripMinutes: number }>,
  excludeBookingId?: string,
  bookingIds?: string[],
): boolean {
  const filtered = existing.filter((_, index) => {
    if (!excludeBookingId || !bookingIds) return true
    return bookingIds[index] !== excludeBookingId
  })
  return !slotConflictsWithDeliveries(scheduledAt, roundTripMinutes, filtered)
}
