import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { enqueueNotification } from '@/src/lib/notifier'

const PayloadSchema = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params

  return withSyncAuth(req, async (rawBody) => {
    let reason: string | null = null
    if (rawBody.trim().length > 0) {
      try {
        const parsed = PayloadSchema.safeParse(JSON.parse(rawBody))
        if (parsed.success) reason = parsed.data.reason ?? null
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
      }
    }

    const repo = await getRepo('WebBooking')
    const booking = await repo.findOne({ where: { id } })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status !== 'cancelled') {
      await repo.update(booking.id, { status: 'cancelled' })
      booking.status = 'cancelled'
    }

    const userbotBase = process.env.NOTIFY_USERBOT_URL
    if (userbotBase) {
      const endpoint = joinEndpoint(userbotBase, '/events/booking-cancelled')
      const payload = {
        type: 'booking_cancelled',
        bookingId: booking.id,
        publicNumber: booking.publicNumber,
        customerTelegram: booking.customerTelegram,
        reason,
      }
      try {
        await enqueueNotification(endpoint, payload)
      } catch (err) {
        console.error('[admin/bookings/cancel] enqueue failed', err)
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
