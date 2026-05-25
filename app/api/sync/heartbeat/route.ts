import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { SyncCursor } from '@/src/entities/SyncCursor'

const HeartbeatSchema = z.object({
  clientId: z.string().min(1).max(255),
  appVersion: z.string().max(50).optional(),
  lastLocalSyncAt: z.number().int().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof HeartbeatSchema.safeParse>
    try {
      parsed = HeartbeatSchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const { clientId, appVersion, lastLocalSyncAt } = parsed.data

    const repo = await getRepo(SyncCursor)
    let cursor = await repo.findOne({ where: { clientId } })

    if (!cursor) {
      cursor = repo.create({ clientId })
    }

    cursor.appVersion = appVersion ?? cursor.appVersion
    cursor.lastHeartbeatAt = new Date()
    if (lastLocalSyncAt) {
      cursor.lastPulledAt = new Date(lastLocalSyncAt)
    }

    await repo.save(cursor)

    return NextResponse.json({ ok: true, serverTime: Date.now() })
  })
}
