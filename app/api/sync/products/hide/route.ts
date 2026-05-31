import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'

const BodySchema = z.object({
  externalIds: z.array(z.number().int().positive()).min(1),
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

    const repo = await getRepo('ProductSnapshot')
    const result = await repo
      .createQueryBuilder()
      .update()
      .set({ isHidden: true })
      .where('externalId IN (:...ids)', { ids: parsed.data.externalIds })
      .execute()

    if ((result.affected ?? 0) > 0) {
      revalidatePath('/')
    }

    return NextResponse.json({ hidden: result.affected ?? 0 })
  })
}
