import { NextRequest, NextResponse } from 'next/server'
import { consumeVerificationToken } from '@/src/lib/verificationToken'
import { signTgSession, tgSessionCookieName } from '@/src/lib/tgSession'
import { resolvePublicSiteUrl } from '@/src/lib/siteUrl'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await context.params
  const siteBase = resolvePublicSiteUrl(req)
  const verified = await consumeVerificationToken(token)
  if (!verified) {
    return NextResponse.redirect(new URL('/?verify=expired', siteBase))
  }

  const cookieValue = signTgSession({
    telegramUsername: verified.telegramUsername,
    telegramUserId: verified.telegramUserId,
  })

  const response = NextResponse.redirect(new URL('/?verified=1', siteBase))
  response.cookies.set(tgSessionCookieName(), cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return response
}
