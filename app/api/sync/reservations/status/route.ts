import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { In } from 'typeorm'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import type { WebBooking, WebBookingStatus } from '@/src/entities/WebBooking'
import { cancelWebBooking } from '@/src/lib/cancelWebBooking'
import { markCustomerTrusted } from '@/src/lib/customerStats'
import { enqueueNotification } from '@/src/lib/notifier'

const UpdateSchema = z.object({
  updates: z.array(
    z.object({
      webBookingId: z.string().uuid(),
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
      appReservationId: z.number().int().optional(),
      reason: z.string().max(500).optional(),
    }),
  ).min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof UpdateSchema.safeParse>
    try {
      parsed = UpdateSchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const repo = await getRepo('WebBooking')
    let updated = 0

    const statusChanges: Array<{
      bookingId: string
      newStatus: WebBookingStatus
      previousStatus: WebBookingStatus
      reason: string | null
    }> = []

    for (const u of parsed.data.updates) {
      const booking = await repo.findOne({ where: { id: u.webBookingId } })
      if (!booking) continue

      const previousStatus = booking.status
      const newStatus = u.status as WebBookingStatus

      if (previousStatus === newStatus) {
        continue
      }

      if (newStatus === 'cancelled') {
        await cancelWebBooking(booking, u.reason ?? null, { cancelledBy: 'admin' })
        if (u.appReservationId !== undefined) {
          await repo.update(booking.id, {
            appReservationId: u.appReservationId,
            syncedToAppAt: new Date(),
          })
        }
        updated++
        continue
      }

      const updateData: Partial<WebBooking> = { status: newStatus }
      if (u.appReservationId !== undefined) {
        updateData.appReservationId = u.appReservationId
        updateData.syncedToAppAt = new Date()
      }

      await repo.update(booking.id, updateData)
      updated++

      if (newStatus === 'completed') {
        try {
          await markCustomerTrusted(booking.customerTelegram)
        } catch (err) {
          console.error('[reservations/status] markCustomerTrusted failed', err)
        }
      }

      if (newStatus === 'confirmed' || newStatus === 'completed') {
        statusChanges.push({
          bookingId: booking.id,
          newStatus,
          previousStatus,
          reason: u.reason ?? null,
        })
      }
    }

    if (statusChanges.length > 0) {
      await dispatchUserbotEvents(statusChanges)
    }

    if (updated > 0) {
      revalidatePath('/admin')
      revalidatePath('/admin/bookings')
    }

    return NextResponse.json({ updated })
  })
}

async function dispatchUserbotEvents(
  changes: Array<{
    bookingId: string
    newStatus: WebBookingStatus
    previousStatus: WebBookingStatus
    reason: string | null
  }>,
): Promise<void> {
  const userbotBase = process.env.NOTIFY_USERBOT_URL
  if (!userbotBase) return

  const bookingRepo = await getRepo('WebBooking')
  const bookings = await bookingRepo.find({
    where: { id: In(changes.map((c) => c.bookingId)) },
    relations: { location: true, customAddress: true },
  })

  const productRepo = await getRepo('ProductSnapshot')
  const productIds = Array.from(
    new Set(bookings.flatMap((b) => b.items.map((i) => i.productId))),
  )
  const products =
    productIds.length > 0
      ? await productRepo.find({ where: { id: In(productIds) } })
      : []
  const productMap = new Map(products.map((p) => [p.id, p]))

  for (const change of changes) {
    const booking = bookings.find((b) => b.id === change.bookingId)
    if (!booking) continue

    if (change.newStatus === 'confirmed') {
      const endpoint = joinEndpoint(userbotBase, '/events/booking-confirmed')
      const payload = {
        type: 'booking_confirmed',
        bookingId: booking.id,
        publicNumber: booking.publicNumber,
        customerTelegram: booking.customerTelegram,
        scheduledAt: booking.scheduledAt.toISOString(),
        locationLabel: booking.location?.name ?? booking.customAddress?.label ?? null,
        items: booking.items.map((item) => {
          const product = productMap.get(item.productId)
          return {
            flavor: product?.flavor ?? '',
            brand: product?.brand ?? '',
            quantity: item.quantity,
            price: item.retailPriceSnapshot,
          }
        }),
        totalAmount: Number(booking.totalAmount),
      }
      try {
        await enqueueNotification(endpoint, payload)
      } catch (err) {
        console.error('[reservations/status] enqueue confirmed failed', err)
      }
    } else if (change.newStatus === 'completed') {
      const endpoint = joinEndpoint(userbotBase, '/events/sale-completed')
      const payload = {
        type: 'sale_completed',
        bookingId: booking.id,
        publicNumber: booking.publicNumber,
        customerTelegram: booking.customerTelegram,
      }
      try {
        await enqueueNotification(endpoint, payload)
      } catch (err) {
        console.error('[reservations/status] enqueue sale-completed failed', err)
      }
    }
  }
}

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}
