import { NextRequest, NextResponse } from 'next/server'
import { MoreThan } from 'typeorm'
import { verifySyncAuth } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifySyncAuth(req, '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sinceMs = parseInt(req.nextUrl.searchParams.get('since') ?? '0', 10)
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 200)
  const since = new Date(sinceMs || 0)

  const repo = await getRepo('AppAlert')
  const alerts = await repo.find({
    where: { createdAt: MoreThan(since) },
    order: { createdAt: 'ASC' },
    take: limit,
  })

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      payload: a.payload,
      createdAt: a.createdAt.getTime(),
    })),
    count: alerts.length,
  })
}
