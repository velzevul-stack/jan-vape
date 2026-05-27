import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifySyncAuth } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { findBookingByTelegram } from '@/src/lib/telegramBooking'

const QuerySchema = z.object({
  customerTelegram: z.string().min(2).max(255),
  since: z.coerce.number().int().min(0).default(0),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifySyncAuth(req, '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  const { customerTelegram, since } = parsed.data
  const sinceDate = new Date(since || 0)

  const repo = await getRepo('WebBooking')
  const booking = await findBookingByTelegram(repo, customerTelegram, {
    since: sinceDate,
    statuses: ['pending', 'confirmed', 'completed'],
  })

  return NextResponse.json({ hasBooking: Boolean(booking) })
}
