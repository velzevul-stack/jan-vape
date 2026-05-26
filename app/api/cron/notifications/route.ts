import { NextRequest, NextResponse } from 'next/server'
import { deliverPending } from '@/src/lib/notifier'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET ?? ''
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await deliverPending()
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req)
}
