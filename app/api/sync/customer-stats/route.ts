import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getCustomerStatsForTelegram } from '@/src/lib/customerStats'
import { normalizeTelegramUsername } from '@/lib/telegram'

const QuerySchema = z.object({
  telegram: z.string().min(2).max(255),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async () => {
    const parsed = QuerySchema.safeParse({
      telegram: req.nextUrl.searchParams.get('telegram') ?? '',
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const normalized = normalizeTelegramUsername(parsed.data.telegram)
    const stats = await getCustomerStatsForTelegram(normalized)

    return NextResponse.json({ stats })
  })
}
