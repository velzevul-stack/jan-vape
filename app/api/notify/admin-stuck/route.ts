import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { enqueueNotification } from '@/src/lib/notifier'
import { enqueueAppAlert } from '@/src/lib/appAlerts'
import { findBookingByTelegram } from '@/src/lib/telegramBooking'
import { normalizeTelegramUsername } from '@/lib/telegram'

const PayloadSchema = z.object({
  customerTelegram: z.string().min(2).max(255),
  lastMessage: z.string().max(2000).optional(),
  notifyKind: z.enum(['summon', 'client_message']).default('summon'),
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

    const { customerTelegram, lastMessage, notifyKind } = parsed.data
    const normalizedTelegram = normalizeTelegramUsername(customerTelegram)

    const adminBase = process.env.NOTIFY_ADMIN_BOT_URL
    if (!adminBase) {
      return NextResponse.json({ ok: true, dispatched: false, reason: 'NOTIFY_ADMIN_BOT_URL not set' })
    }

    const bookingRepo = await getRepo('WebBooking')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentInHour = await findBookingByTelegram(bookingRepo, normalizedTelegram, {
      since: oneHourAgo,
    })
    const activeBooking = await findBookingByTelegram(bookingRepo, normalizedTelegram, {
      statuses: ['pending', 'confirmed'],
    })

    const endpoint = joinEndpoint(adminBase, '/events/customer-stuck')
    const payload = {
      type: 'customer_stuck',
      notifyKind,
      customerTelegram: normalizedTelegram,
      lastMessage: lastMessage ?? null,
      hasActiveBooking: Boolean(activeBooking),
      publicNumber: activeBooking?.publicNumber ?? null,
      bookingStatus: activeBooking?.status ?? null,
      hasBookingInLastHour: Boolean(recentInHour),
    }

    await enqueueNotification(endpoint, payload)
    await enqueueAppAlert('customer_stuck', payload)

    return NextResponse.json({ ok: true, dispatched: true })
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
