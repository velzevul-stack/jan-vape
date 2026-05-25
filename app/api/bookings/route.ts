import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRepo } from '@/src/lib/db'
import { WebBooking } from '@/src/entities/WebBooking'
import { PickupLocation } from '@/src/entities/PickupLocation'
import { CustomAddress } from '@/src/entities/CustomAddress'
import { normalizeAddress } from '@/src/lib/normalize'
import { getDataSource } from '@/src/lib/db'

const BookingSchema = z.object({
  pickupLocationId: z.string().uuid().optional(),
  customAddressText: z.string().min(2).max(500).optional(),
  scheduledAt: z.string().datetime(),
  customerName: z.string().min(2).max(255),
  customerTelegram: z.string().min(3).max(255),
  comment: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        retailPriceSnapshot: z.number().min(0),
      }),
    )
    .min(1),
}).refine(
  (d) => d.pickupLocationId || d.customAddressText,
  'Either pickupLocationId or customAddressText is required',
)

function generatePublicNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `B-${datePart}-${rand}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data
  const scheduledAt = new Date(data.scheduledAt)

  const ds = await getDataSource()

  return ds.transaction(async (txn) => {
    let locationId: string | null = null
    let customAddressId: string | null = null
    let maxBookings = 1

    if (data.pickupLocationId) {
      const loc = await txn.findOne(PickupLocation, { where: { id: data.pickupLocationId } })
      if (!loc || !loc.isActive) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      locationId = loc.id
      maxBookings = loc.maxBookingsPerSlot
    } else if (data.customAddressText) {
      const key = normalizeAddress(data.customAddressText)
      let addr = await txn.findOne(CustomAddress, { where: { normalizedKey: key } })
      if (!addr) {
        addr = txn.create(CustomAddress, {
          normalizedKey: key,
          label: data.customAddressText.trim(),
          salesCount: 0,
          isPromoted: false,
        })
        await txn.save(addr)
      }
      customAddressId = addr.id
    }

    const slotStart = new Date(scheduledAt)
    const slotEnd = new Date(scheduledAt.getTime() + 5 * 60 * 1000)

    const existingCount = await txn
      .createQueryBuilder(WebBooking, 'wb')
      .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
      .andWhere('wb.scheduledAt >= :start AND wb.scheduledAt < :end', {
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      })
      .andWhere(
        locationId
          ? 'wb.locationId = :locationId'
          : 'wb.locationId IS NULL',
        locationId ? { locationId } : {},
      )
      .getCount()

    if (existingCount >= maxBookings) {
      return NextResponse.json(
        { error: 'This time slot is already taken. Please choose another time.' },
        { status: 409 },
      )
    }

    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.retailPriceSnapshot * item.quantity,
      0,
    )

    const booking = txn.create(WebBooking, {
      publicNumber: generatePublicNumber(),
      source: 'web',
      customerName: data.customerName,
      customerTelegram: data.customerTelegram,
      comment: data.comment ?? null,
      scheduledAt,
      locationId,
      customAddressId,
      items: data.items,
      totalAmount,
      status: 'pending',
    })

    await txn.save(booking)

    return NextResponse.json(
      {
        publicNumber: booking.publicNumber,
        bookingId: booking.id,
        scheduledAt: booking.scheduledAt.toISOString(),
      },
      { status: 201 },
    )
  })
}
