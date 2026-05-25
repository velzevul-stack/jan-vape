import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { ProductSnapshot } from '@/src/entities/ProductSnapshot'

const BodySchema = z.object({
  updates: z
    .array(
      z.object({
        externalId: z.number().int().positive(),
        postStock: z.number().int().min(0),
      }),
    )
    .min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof BodySchema.safeParse>
    try {
      parsed = BodySchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const repo = await getRepo(ProductSnapshot)
    let updated = 0

    for (const item of parsed.data.updates) {
      const result = await repo.update({ externalId: item.externalId }, { postStock: item.postStock })
      if (result.affected) updated += result.affected
    }

    return NextResponse.json({ updated })
  })
}
