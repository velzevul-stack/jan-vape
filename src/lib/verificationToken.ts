import { randomBytes } from 'crypto'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { getRepo } from './db'
import { ensureTelegramCustomer } from './telegramCustomer'
import { telegramLookupKey } from './telegramBooking'

const TOKEN_TTL_MINUTES = 45

function siteBaseUrl(): string {
  return (process.env.SITE_PUBLIC_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')
}

export async function createVerificationToken(input: {
  customerTelegram: string
  telegramUserId?: string | number | null
}): Promise<{ token: string; url: string; expiresAt: Date }> {
  const normalized = normalizeTelegramUsername(input.customerTelegram)
  const lookupKey = telegramLookupKey(normalized)
  const repo = await getRepo('VerificationToken')
  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

  await repo.save(
    repo.create({
      token,
      telegramUsername: lookupKey,
      telegramUserId:
        input.telegramUserId === null || input.telegramUserId === undefined
          ? null
          : String(input.telegramUserId),
      expiresAt,
      usedAt: null,
    }),
  )

  const base = siteBaseUrl()
  const url = base ? `${base}/v/${token}` : `/v/${token}`
  return { token, url, expiresAt }
}

export async function consumeVerificationToken(token: string): Promise<{
  telegramUsername: string
  telegramUserId: string | null
} | null> {
  const repo = await getRepo('VerificationToken')
  const row = await repo.findOne({ where: { token } })
  if (!row) return null
  if (row.usedAt) return null
  if (row.expiresAt.getTime() < Date.now()) return null

  await repo.update(row.id, { usedAt: new Date() })

  const customer = await ensureTelegramCustomer(row.telegramUsername)
  const customerRepo = await getRepo('TelegramCustomer')
  await customerRepo.update(customer.id, {
    verifiedAt: new Date(),
    telegramId: row.telegramUserId ?? customer.telegramId,
  })

  return {
    telegramUsername: normalizeTelegramUsername(row.telegramUsername),
    telegramUserId: row.telegramUserId,
  }
}
