import { NextRequest, NextResponse } from 'next/server'
import { consumeVerificationToken } from '@/src/lib/verificationToken'
import { signTgSession, tgSessionCookieName } from '@/src/lib/tgSession'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await context.params
  const verified = await consumeVerificationToken(token)
  if (!verified) {
    return NextResponse.redirect(new URL('/?verify=expired', _req.url))
  }

  const cookieValue = signTgSession({
    telegramUsername: verified.telegramUsername,
    telegramUserId: verified.telegramUserId,
  })

  const response = NextResponse.redirect(new URL('/?verified=1', _req.url))
  response.cookies.set(tgSessionCookieName(), cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return response
}
