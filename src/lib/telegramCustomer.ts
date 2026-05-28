import { normalizeTelegramUsername } from '@/lib/telegram'
import type { TelegramCustomer } from '@/src/entities/TelegramCustomer'
import { getRepo } from './db'
import { telegramLookupKey } from './telegramBooking'

export async function ensureTelegramCustomer(
  customerTelegram: string,
): Promise<TelegramCustomer> {
  const normalized = normalizeTelegramUsername(customerTelegram)
  const lookupKey = telegramLookupKey(normalized)
  const repo = await getRepo('TelegramCustomer')

  const existing = await repo.findOne({ where: { telegramUsername: lookupKey } })
  if (existing) {
    return existing
  }

  const created = repo.create({ telegramUsername: lookupKey })
  return repo.save(created)
}
