import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRepo } from '@/src/lib/db'
import { PickupLocation } from '@/src/entities/PickupLocation'
import { storeDayBounds } from '@/lib/dates'
import { generateSlots } from '@/src/lib/slots'

const QuerySchema = z.object({
  locationId: z.string().uuid().optional(),
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
  workDayStart: '10:00',
  workDayEnd: '21:00',
  maxBookingsPerSlot: 1,
  slotStepMinutes: 5,
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query params', details: parsed.error.flatten() }, { status: 400 })
  }

  const { locationId, date } = parsed.data

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
        : 'wb.locationId IS NULL',
      locationId ? { locationId } : {},
    )
    .getMany()

  const slots = generateSlots(date, location, bookings, [])

  return NextResponse.json({
    date,
    locationId: location.id,
    timezone: 'Europe/Minsk',
    slots,
  })
}
