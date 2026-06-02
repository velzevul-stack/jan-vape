import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { In } from 'typeorm'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { enqueueNotification } from '@/src/lib/notifier'
import { enrichUserbotPayload } from '@/src/lib/customerTelegramUserId'
import {
  mapBookingProductLines,
  withDeliveryInComposition,
} from '@/src/lib/bookingComposition'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params

  return withSyncAuth(req, async () => {
    const repo = await getRepo('WebBooking')
    const booking = await repo.findOne({
      where: { id },
      relations: { location: true, customAddress: true, deliveryZone: true },
    })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json(
        { error: `Cannot confirm a ${booking.status} booking` },
        { status: 409 },
      )
    }

    const shouldNotify = booking.status !== 'confirmed'

    if (shouldNotify) {
      await repo.update(booking.id, { status: 'confirmed' })
      booking.status = 'confirmed'
    }

    const userbotBase = process.env.NOTIFY_USERBOT_URL
    if (userbotBase && shouldNotify) {
      const productRepo = await getRepo('ProductSnapshot')
      const productIds = Array.from(new Set(booking.items.map((i) => i.productId)))
      const products =
        productIds.length > 0
          ? await productRepo.find({ where: { id: In(productIds) } })
          : []
      const productMap = new Map(products.map((p) => [p.id, p]))
      const compositionItems = withDeliveryInComposition(
        mapBookingProductLines(booking.items, productMap),
        Number(booking.deliveryFee),
        booking.deliveryZone?.name ?? null,
      )

      const endpoint = joinEndpoint(userbotBase, '/events/booking-confirmed')
      const payload = await enrichUserbotPayload(
        {
          type: 'booking_confirmed',
          bookingId: booking.id,
          publicNumber: booking.publicNumber,
          customerTelegram: booking.customerTelegram,
          scheduledAt: booking.scheduledAt.toISOString(),
          locationLabel: booking.location?.name ?? booking.customAddress?.label ?? null,
          items: compositionItems,
          totalAmount: Number(booking.totalAmount),
        },
        booking,
      )
      try {
        await enqueueNotification(endpoint, payload)
      } catch (err) {
        console.error('[admin/bookings/confirm] enqueue failed', err)
      }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/bookings')

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
      status: booking.status,
    })
  })
}

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}
