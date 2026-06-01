import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { verifyTgExchange } from '@/src/lib/tgExchange'
import { signTgSession, tgSessionCookieName } from '@/src/lib/tgSession'

const bodySchema = z.object({
  exchange: z.string().min(10).max(2048),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const payload = verifyTgExchange(parsed.exchange)
  if (!payload) {
    return NextResponse.json({ error: 'invalid_or_expired' }, { status: 401 })
  }

  const customerTelegram = normalizeTelegramUsername(
    payload.u.startsWith('@') ? payload.u : `@${payload.u}`,
  )

  const response = NextResponse.json({
    verified: true,
    customerTelegram,
    telegramUserId: payload.id,
    maxCartQuantity: null,
  })
  response.cookies.set(
    tgSessionCookieName(),
    signTgSession({
      telegramUsername: customerTelegram,
      telegramUserId: payload.id,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    },
  )
  return response
}
