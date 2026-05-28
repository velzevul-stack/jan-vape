import { NextRequest, NextResponse } from 'next/server'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { tgSessionCookieName, verifyTgSession } from '@/src/lib/tgSession'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = verifyTgSession(req.cookies.get(tgSessionCookieName())?.value)
  if (!session) {
    return NextResponse.json({ verified: false })
  }

  return NextResponse.json({
    verified: true,
    customerTelegram: normalizeTelegramUsername(session.u.startsWith('@') ? session.u : `@${session.u}`),
    telegramUserId: session.id,
  })
}
