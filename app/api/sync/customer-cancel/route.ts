import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { cancelWebBooking } from '@/src/lib/cancelWebBooking'
import { getRepo } from '@/src/lib/db'
import { findBookingByTelegram } from '@/src/lib/telegramBooking'

const PayloadSchema = z.object({
  customerTelegram: z.string().min(2).max(255),
  lastMessage: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof PayloadSchema.safeParse>
    try {
      parsed = PayloadSchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { customerTelegram, lastMessage } = parsed.data
    const normalizedTelegram = normalizeTelegramUsername(customerTelegram)

    const repo = await getRepo('WebBooking')
    const booking = await findBookingByTelegram(repo, normalizedTelegram, {
      statuses: ['pending', 'confirmed'],
    })

    if (!booking) {
      return NextResponse.json(
        { ok: false, cancelled: false, reason: 'no_active_booking' },
        { status: 404 },
      )
    }

    const reason = 'Отменено клиентом в Telegram'
    await cancelWebBooking(booking, reason, {
      lastMessage: lastMessage ?? null,
      cancelledBy: 'customer',
      notifyCustomer: false,
    })

    return NextResponse.json({
      ok: true,
      cancelled: true,
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
    })
  })
}
