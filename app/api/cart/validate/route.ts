import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { isSessionVerified, isTelegramVerified } from '@/src/lib/telegramVerification'

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

  return NextResponse.json({
    ok: true,
    verified: isVerified,
    maxCartQuantity: null,
  })
}
