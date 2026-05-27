import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifySyncAuth } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'

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
  const booking = await repo
    .createQueryBuilder('wb')
    .where('wb.customerTelegram = :tg', { tg: customerTelegram })
    .andWhere('wb.createdAt >= :since', { since: sinceDate.toISOString() })
    .andWhere('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed', 'completed'] })
    .orderBy('wb.createdAt', 'DESC')
    .limit(1)
    .getOne()

  return NextResponse.json({ hasBooking: Boolean(booking) })
}
