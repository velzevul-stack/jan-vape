import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRepo } from '@/src/lib/db'
import { PickupLocation } from '@/src/entities/PickupLocation'
import { storeDayBounds, STORE_SLOT_END, STORE_SLOT_START } from '@/lib/dates'
import { generateDeliverySlots, generatePickupSlots } from '@/src/lib/slots'
import {
  findBlockedSlotsForPickup,
  findGlobalBlockedSlots,
} from '@/src/lib/blockedSlots'
import { buildZoneMinutesMap, toDeliverySlotEntries } from '@/src/lib/deliverySlotGuard'

const QuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  deliveryZoneId: z.string().uuid().optional(),
  customAddress: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const DEFAULT_LOCATION: PickupLocation = {
  id: 'default',
  code: 'DEFAULT',
  name: 'Основное место',
  address: '',
  isActive: true,
  isFeatured: true,
  sortOrder: 0,
  workDayStart: STORE_SLOT_START,
  workDayEnd: STORE_SLOT_END,
  maxBookingsPerSlot: 1,
  slotStepMinutes: 5,
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query params', details: parsed.error.flatten() }, { status: 400 })
  }

  const { locationId, deliveryZoneId, date } = parsed.data

  let location: PickupLocation | null = null
  if (locationId) {
    const repo = await getRepo('PickupLocation')
    location = await repo.findOne({ where: { id: locationId } })
  }
  if (!location) {
    location = DEFAULT_LOCATION
  }

  const { start: dayStart, end: dayEnd } = storeDayBounds(date)
  const bookingRepo = await getRepo('WebBooking')
  const blockedRepo = await getRepo('BlockedSlot')

  if (deliveryZoneId) {
    const zoneRepo = await getRepo('DeliveryZone')
    const zone = await zoneRepo.findOne({ where: { id: deliveryZoneId, isActive: true } })
    if (!zone) {
      return NextResponse.json({ error: 'Delivery zone not found' }, { status: 404 })
    }

    const deliveryBookings = await bookingRepo
      .createQueryBuilder('wb')
      .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
      .andWhere('wb.scheduledAt BETWEEN :start AND :end', {
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
      })
      .andWhere('wb.deliveryZoneId IS NOT NULL')
      .getMany()

    const blockedSlots = await findGlobalBlockedSlots(blockedRepo, dayStart, dayEnd)
    const allZones = await zoneRepo.find({ where: { isActive: true } })
    const zoneMinutesById = buildZoneMinutesMap(allZones)
    const existingDeliveries = toDeliverySlotEntries(deliveryBookings, zoneMinutesById)

    const slots = generateDeliverySlots(
      date,
      location,
      existingDeliveries,
      zone.roundTripMinutes,
      blockedSlots,
    )

    return NextResponse.json({
      date,
      deliveryZoneId: zone.id,
      roundTripMinutes: zone.roundTripMinutes,
      deliveryFee: Number(zone.deliveryFee),
      timezone: 'Europe/Minsk',
      slots,
    })
  }

  const bookings = await bookingRepo
    .createQueryBuilder('wb')
    .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
    .andWhere('wb.scheduledAt BETWEEN :start AND :end', {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    })
    .andWhere(
      locationId
        ? 'wb.locationId = :locationId'
        : 'wb.locationId IS NULL AND wb.deliveryZoneId IS NULL',
      locationId ? { locationId } : {},
    )
    .getMany()

  const blockedSlots = locationId
    ? await findBlockedSlotsForPickup(blockedRepo, dayStart, dayEnd, locationId)
    : await findGlobalBlockedSlots(blockedRepo, dayStart, dayEnd)

  const slots = generatePickupSlots(date, location, bookings, blockedSlots)

  return NextResponse.json({
    date,
    locationId: location.id,
    timezone: 'Europe/Minsk',
    slots,
  })
}
