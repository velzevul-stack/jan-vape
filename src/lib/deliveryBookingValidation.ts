import {
  slotConflictsWithDeliveries,
  type DeliverySlotConflictInput,
} from './deliveryBusyWindow'

export function assertDeliverySlotAvailable(
  scheduledAt: Date,
  roundTripMinutes: number,
  existing: DeliverySlotConflictInput[],
  requestedSingleSlotOnly = false,
  requestedZoneId?: string,
): boolean {
  return !slotConflictsWithDeliveries(
    scheduledAt,
    roundTripMinutes,
    existing,
    requestedSingleSlotOnly,
    requestedZoneId,
  )
}
