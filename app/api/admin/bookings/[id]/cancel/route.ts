import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { cancelWebBooking } from '@/src/lib/cancelWebBooking'
import { getRepo } from '@/src/lib/db'

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

    await cancelWebBooking(booking, reason, { cancelledBy: 'admin' })

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
      status: booking.status,
    })
  })
}
