import { NextRequest, NextResponse } from 'next/server'
import { Between } from 'typeorm'
import { verifyBasicAuth, verifySyncAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { storeDayBounds, storeTodayIso } from '@/lib/dates'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const isBasic = verifyBasicAuth(req)
  const isHmac = !isBasic && verifySyncAuth(req, '')
  if (!isBasic && !isHmac) return unauthorizedResponse()

  const date = storeTodayIso()
  const { start, end } = storeDayBounds(date)
  const repo = await getRepo('WebBooking')

  const [cancelled, completed] = await Promise.all([
    repo.count({
      where: {
        status: 'cancelled',
        updatedAt: Between(start, end),
      },
    }),
    repo.count({
      where: {
        status: 'completed',
        updatedAt: Between(start, end),
      },
    }),
  ])

  return NextResponse.json({
    date,
    timezone: 'Europe/Minsk',
    bookings: {
      cancelled,
      completed,
    },
  })
}
