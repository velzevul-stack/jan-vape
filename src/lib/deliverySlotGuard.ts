import { assertDeliverySlotAvailable } from './deliveryBookingValidation'
import { isIvatsevichiDeliveryZone } from './ivatsevichiZone'

export interface DeliverySlotBookingLike {
  id?: string
  scheduledAt: Date | string
  roundTripMinutes?: number | null
  deliveryZoneId?: string | null
}

export interface DeliveryZoneMeta {
  id: string
  code: string
  name: string
  roundTripMinutes: number
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

export function buildZoneMinutesMap(
  zones: Array<{ id: string; roundTripMinutes: number }>,
): Map<string, number> {
  return new Map(zones.map((zone) => [zone.id, zone.roundTripMinutes]))
}

export function buildZoneSingleSlotMap(zones: DeliveryZoneMeta[]): Map<string, boolean> {
  return new Map(
    zones.map((zone) => [zone.id, isIvatsevichiDeliveryZone(zone)]),
  )
}

export function toDeliverySlotEntries(
  bookings: DeliverySlotBookingLike[],
  zoneMinutesById: Map<string, number>,
  zoneSingleSlotById: Map<string, boolean>,
  excludeBookingId?: string,
): Array<{ scheduledAt: Date; roundTripMinutes: number; singleSlotOnly: boolean }> {
  const entries: Array<{
    scheduledAt: Date
    roundTripMinutes: number
    singleSlotOnly: boolean
  }> = []
  for (const booking of bookings) {
    if (excludeBookingId && booking.id === excludeBookingId) continue
    if (!booking.deliveryZoneId) continue
    const minutes = effectiveRoundTripMinutes(booking, zoneMinutesById)
    if (minutes == null) continue
    entries.push({
      scheduledAt: new Date(booking.scheduledAt),
      roundTripMinutes: minutes,
      singleSlotOnly: zoneSingleSlotById.get(booking.deliveryZoneId) === true,
    })
  }
  return entries
}

export function isDeliverySlotAvailable(
  scheduledAt: Date,
  roundTripMinutes: number,
  bookings: DeliverySlotBookingLike[],
  zoneMinutesById: Map<string, number>,
  zoneSingleSlotById: Map<string, boolean>,
  requestZoneId?: string | null,
  excludeBookingId?: string,
): boolean {
  const existing = toDeliverySlotEntries(
    bookings,
    zoneMinutesById,
    zoneSingleSlotById,
    excludeBookingId,
  )
  const requestedSingleSlotOnly =
    requestZoneId != null ? zoneSingleSlotById.get(requestZoneId) === true : false
  return assertDeliverySlotAvailable(
    scheduledAt,
    roundTripMinutes,
    existing,
    requestedSingleSlotOnly,
  )
}
