import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { enqueueNotification } from '@/src/lib/notifier'

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

    const adminBase = process.env.NOTIFY_ADMIN_BOT_URL
    if (!adminBase) {
      return NextResponse.json({ ok: true, dispatched: false, reason: 'NOTIFY_ADMIN_BOT_URL not set' })
    }

    const bookingRepo = await getRepo('WebBooking')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recent = await bookingRepo
      .createQueryBuilder('wb')
      .where('wb.customerTelegram = :tg', { tg: customerTelegram })
      .andWhere('wb.createdAt >= :since', { since: oneHourAgo.toISOString() })
      .orderBy('wb.createdAt', 'DESC')
      .limit(1)
      .getOne()

    const endpoint = joinEndpoint(adminBase, '/events/customer-stuck')
    const payload = {
      type: 'customer_stuck',
      customerTelegram,
      lastMessage: lastMessage ?? null,
      noBookingSince: recent ? null : oneHourAgo.toISOString(),
    }

    await enqueueNotification(endpoint, payload)

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
