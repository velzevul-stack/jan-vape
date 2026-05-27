import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeAddress } from '@/src/lib/normalize'
import { In } from 'typeorm'
import { entityTableNames, getDataSource } from '@/src/lib/db'
import { findBookingStockIssues } from '@/src/lib/availability'
import { enqueueNotification } from '@/src/lib/notifier'

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

interface SavedBookingResult {
  bookingId: string
  publicNumber: string
  scheduledAt: string
  customerName: string
  customerTelegram: string
  comment: string | null
  totalAmount: number
  locationLabel: string | null
  customAddressLabel: string | null
  itemsSnapshot: Array<{
    productId: string
    quantity: number
    retailPriceSnapshot: number
  }>
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

  let saved: SavedBookingResult | null = null
  let errorResponse: NextResponse | null = null

  await ds.transaction(async (txn) => {
    const locationRepo = txn.getRepository(entityTableNames.PickupLocation)
    const addressRepo = txn.getRepository(entityTableNames.CustomAddress)
    const bookingRepo = txn.getRepository(entityTableNames.WebBooking)

    let locationId: string | null = null
    let customAddressId: string | null = null
    let locationLabel: string | null = null
    let customAddressLabel: string | null = null

    if (data.pickupLocationId) {
      const loc = await locationRepo.findOne({ where: { id: data.pickupLocationId } })
      if (!loc || !loc.isActive) {
        errorResponse = NextResponse.json({ error: 'Location not found' }, { status: 404 })
        return
      }
      locationId = loc.id
      locationLabel = loc.name
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
      customAddressLabel = addr.label
    }

    const stockIssues = await findBookingStockIssues(
      data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      txn,
    )
    if (stockIssues.length > 0) {
      errorResponse = NextResponse.json(
        { error: 'Insufficient stock', issues: stockIssues },
        { status: 409 },
      )
      return
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

    saved = {
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
      scheduledAt: booking.scheduledAt.toISOString(),
      customerName: booking.customerName,
      customerTelegram: booking.customerTelegram,
      comment: booking.comment,
      totalAmount,
      locationLabel,
      customAddressLabel,
      itemsSnapshot: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        retailPriceSnapshot: item.retailPriceSnapshot,
      })),
    }
  })

  if (errorResponse) return errorResponse
  if (!saved) {
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 })
  }

  const savedBooking = saved as SavedBookingResult

  const productRepo = (await getDataSource()).getRepository(entityTableNames.ProductSnapshot)
  const productIds = Array.from(new Set(savedBooking.itemsSnapshot.map((i) => i.productId)))
  const products =
    productIds.length > 0 ? await productRepo.find({ where: { id: In(productIds) } }) : []
  const productMap = new Map(products.map((p) => [p.id, p]))

  const adminEventsBase = process.env.NOTIFY_ADMIN_BOT_URL
  if (adminEventsBase) {
    const endpoint = joinEndpoint(adminEventsBase, '/events/booking-created')
    const payload = {
      type: 'booking_created',
      bookingId: savedBooking.bookingId,
      publicNumber: savedBooking.publicNumber,
      customerName: savedBooking.customerName,
      customerTelegram: savedBooking.customerTelegram,
      scheduledAt: savedBooking.scheduledAt,
      location: savedBooking.locationLabel,
      customAddress: savedBooking.customAddressLabel,
      items: savedBooking.itemsSnapshot.map((item) => {
        const product = productMap.get(item.productId)
        return {
          flavor: product?.flavor ?? '',
          brand: product?.brand ?? '',
          quantity: item.quantity,
          price: item.retailPriceSnapshot,
        }
      }),
      totalAmount: savedBooking.totalAmount,
      comment: savedBooking.comment,
    }
    try {
      await enqueueNotification(endpoint, payload)
    } catch (err) {
      console.error('[bookings] failed to enqueue admin-bot notification', err)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/')

  return NextResponse.json(
    {
      publicNumber: savedBooking.publicNumber,
      bookingId: savedBooking.bookingId,
      scheduledAt: savedBooking.scheduledAt,
    },
    { status: 201 },
  )
}

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}
