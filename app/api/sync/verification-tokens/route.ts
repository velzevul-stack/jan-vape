import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { createVerificationToken } from '@/src/lib/verificationToken'
import { normalizeTelegramUsername } from '@/lib/telegram'

const PayloadSchema = z.object({
  customerTelegram: z.string().min(2).max(255),
  telegramUserId: z.union([z.string(), z.number()]).optional().nullable(),
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

    const created = await createVerificationToken({
      customerTelegram: normalizeTelegramUsername(parsed.data.customerTelegram),
      telegramUserId: parsed.data.telegramUserId ?? null,
    })

    return NextResponse.json({
      ok: true,
      token: created.token,
      url: created.url,
      expiresAt: created.expiresAt.toISOString(),
    })
  })
}
