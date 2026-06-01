import { NextRequest, NextResponse } from 'next/server'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { tgSessionCookieName, verifyTgSession } from '@/src/lib/tgSession'
import { isTelegramVerified } from '@/src/lib/telegramVerification'
import { UNVERIFIED_MAX_CART_QUANTITY } from '@/src/lib/unverifiedLimits'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = verifyTgSession(req.cookies.get(tgSessionCookieName())?.value)
  if (session) {
    return NextResponse.json({
      verified: true,
      customerTelegram: normalizeTelegramUsername(session.u.startsWith('@') ? session.u : `@${session.u}`),
      telegramUserId: session.id,
      maxCartQuantity: null,
    })
  }

  const tgParam = req.nextUrl.searchParams.get('tg')?.trim()
  if (tgParam) {
    const customerTelegram = normalizeTelegramUsername(tgParam)
    if (customerTelegram && (await isTelegramVerified(customerTelegram, req))) {
      return NextResponse.json({
        verified: true,
        customerTelegram,
        telegramUserId: null,
        maxCartQuantity: null,
      })
    }
  }

  return NextResponse.json({
    verified: false,
    maxCartQuantity: UNVERIFIED_MAX_CART_QUANTITY,
  })
}
