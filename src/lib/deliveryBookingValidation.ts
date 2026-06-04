import {
  slotConflictsWithDeliveries,
  type DeliverySlotConflictInput,
} from './deliveryBusyWindow'

export function assertDeliverySlotAvailable(
  scheduledAt: Date,
  roundTripMinutes: number,
  existing: DeliverySlotConflictInput[],
  requestedSingleSlotOnly = false,
  excludeBookingId?: string,
  bookingIds?: string[],
): boolean {
  const filtered = existing.filter((_, index) => {
    if (!excludeBookingId || !bookingIds) return true
    return bookingIds[index] !== excludeBookingId
  })
  return !slotConflictsWithDeliveries(
    scheduledAt,
    roundTripMinutes,
    filtered,
    requestedSingleSlotOnly,
  )
}
