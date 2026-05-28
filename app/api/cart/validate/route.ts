import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { isSessionVerified, isTelegramVerified } from '@/src/lib/telegramVerification'
import {
  UNVERIFIED_MAX_CART_QUANTITY,
  assertUnverifiedCartQuantity,
} from '@/src/lib/unverifiedLimits'

const BodySchema = z.object({
  totalQuantity: z.number().int().min(0),
  customerTelegram: z.string().min(2).max(255).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const customerTelegram = parsed.data.customerTelegram
    ? normalizeTelegramUsername(parsed.data.customerTelegram)
    : null

  let isVerified = await isSessionVerified(req)
  if (!isVerified && customerTelegram) {
    isVerified = await isTelegramVerified(customerTelegram, req)
  }

  const cartCheck = assertUnverifiedCartQuantity(parsed.data.totalQuantity, isVerified)
  if (!cartCheck.ok) {
    return NextResponse.json(
      {
        error: cartCheck.message,
        code: 'unverified_cart_limit',
        maxQuantity: UNVERIFIED_MAX_CART_QUANTITY,
      },
      { status: 422 },
    )
  }

  return NextResponse.json({
    ok: true,
    verified: isVerified,
    maxCartQuantity: isVerified ? null : UNVERIFIED_MAX_CART_QUANTITY,
  })
}
