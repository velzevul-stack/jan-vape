import { assertDeliverySlotAvailable } from './deliveryBookingValidation'

export interface DeliverySlotBookingLike {
  id?: string
  scheduledAt: Date | string
  roundTripMinutes?: number | null
  deliveryZoneId?: string | null
}

export function effectiveRoundTripMinutes(
  booking: DeliverySlotBookingLike,
  zoneMinutesById: Map<string, number>,
): number | null {
  if (booking.roundTripMinutes != null && booking.roundTripMinutes > 0) {
    return booking.roundTripMinutes
  }
  const zoneId = booking.deliveryZoneId
  if (!zoneId) return null
  const fromZone = zoneMinutesById.get(zoneId)
  return fromZone != null && fromZone > 0 ? fromZone : null
}

export function toDeliverySlotEntries(
  bookings: DeliverySlotBookingLike[],
  zoneMinutesById: Map<string, number>,
  excludeBookingId?: string,
): Array<{ scheduledAt: Date; roundTripMinutes: number }> {
  const entries: Array<{ scheduledAt: Date; roundTripMinutes: number }> = []
  for (const booking of bookings) {
    if (excludeBookingId && booking.id === excludeBookingId) continue
    if (!booking.deliveryZoneId) continue
    const minutes = effectiveRoundTripMinutes(booking, zoneMinutesById)
    if (minutes == null) continue
    entries.push({
      scheduledAt: new Date(booking.scheduledAt),
      roundTripMinutes: minutes,
    })
  }
  return entries
}

export function buildZoneMinutesMap(
  zones: Array<{ id: string; roundTripMinutes: number }>,
): Map<string, number> {
  return new Map(zones.map((zone) => [zone.id, zone.roundTripMinutes]))
}

export function isDeliverySlotAvailable(
  scheduledAt: Date,
  roundTripMinutes: number,
  bookings: DeliverySlotBookingLike[],
  zoneMinutesById: Map<string, number>,
  excludeBookingId?: string,
): boolean {
  const existing = toDeliverySlotEntries(bookings, zoneMinutesById, excludeBookingId)
  return assertDeliverySlotAvailable(scheduledAt, roundTripMinutes, existing)
}
