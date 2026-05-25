import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeAddress } from '@/src/lib/normalize'
import { entityTableNames, getDataSource } from '@/src/lib/db'

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
    const locationRepo = txn.getRepository(entityTableNames.PickupLocation)
    const addressRepo = txn.getRepository(entityTableNames.CustomAddress)
    const bookingRepo = txn.getRepository(entityTableNames.WebBooking)

    let locationId: string | null = null
    let customAddressId: string | null = null
    let maxBookings = 1

    if (data.pickupLocationId) {
      const loc = await locationRepo.findOne({ where: { id: data.pickupLocationId } })
      if (!loc || !loc.isActive) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      locationId = loc.id
      maxBookings = loc.maxBookingsPerSlot
    } else if (data.customAddressText) {
      const key = normalizeAddress(data.customAddressText)
      let addr = await addressRepo.findOne({ where: { normalizedKey: key } })
      if (!addr) {
        addr = addressRepo.create({
          normalizedKey: key,
          label: data.customAddressText.trim(),
          salesCount: 0,
          isPromoted: false,
        })
        await addressRepo.save(addr)
      }
      customAddressId = addr.id
    }

    const slotStart = new Date(scheduledAt)
    const slotEnd = new Date(scheduledAt.getTime() + 5 * 60 * 1000)

    const existingCount = await bookingRepo
      .createQueryBuilder('wb')
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

    const booking = bookingRepo.create({
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

    await bookingRepo.save(booking)

    revalidatePath('/admin')
    revalidatePath('/admin/bookings')

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
