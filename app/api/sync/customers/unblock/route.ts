import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getCustomerById, getCustomerStatsForTelegram } from '@/src/lib/customerStats'
import { unblockTelegramCustomer } from '@/src/lib/telegramCustomerActions'
import { ensureTelegramCustomer } from '@/src/lib/telegramCustomer'
import { normalizeTelegramUsername } from '@/lib/telegram'

const PayloadSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerTelegram: z.string().min(2).max(255).optional(),
}).refine((data) => Boolean(data.customerId || data.customerTelegram), {
  message: 'customerId or customerTelegram is required',
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

    let customerId = parsed.data.customerId ?? null
    let telegram = parsed.data.customerTelegram
      ? normalizeTelegramUsername(parsed.data.customerTelegram)
      : null

    if (customerId) {
      const existing = await getCustomerById(customerId)
      if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      telegram = existing.telegramUsername
    }

    if (!telegram) {
      return NextResponse.json({ error: 'customerTelegram is required' }, { status: 422 })
    }

    await unblockTelegramCustomer(telegram)

    if (!customerId) {
      const row = await ensureTelegramCustomer(telegram)
      customerId = row.id
    }

    const customer = customerId ? await getCustomerById(customerId) : null
    const stats = customer?.stats ?? await getCustomerStatsForTelegram(telegram)

    return NextResponse.json({
      ok: true,
      customerTelegram: telegram,
      customer,
      stats,
    })
  })
}
