import { normalizeTelegramUsername } from '@/lib/telegram'
import type { WebBooking } from '@/src/entities/WebBooking'
import { getRepo } from './db'
import { telegramLookupKey } from './telegramBooking'

export async function resolveCustomerTelegramUserId(
  customerTelegram: string,
  bookingUserId?: string | null,
): Promise<string | null> {
  if (bookingUserId) {
    return bookingUserId
  }
  const lookupKey = telegramLookupKey(normalizeTelegramUsername(customerTelegram))
  const repo = await getRepo('TelegramCustomer')
  const customer = await repo.findOne({ where: { telegramUsername: lookupKey } })
  return customer?.telegramId ?? null
}

export async function enrichUserbotPayload<T extends Record<string, unknown>>(
  payload: T,
  bookingOrTelegram: WebBooking | string,
): Promise<T & { customerTelegramUserId: string | null }> {
  if (typeof bookingOrTelegram === 'string') {
    const customerTelegramUserId = await resolveCustomerTelegramUserId(bookingOrTelegram)
    return { ...payload, customerTelegramUserId }
  }
  const customerTelegramUserId = await resolveCustomerTelegramUserId(
    bookingOrTelegram.customerTelegram,
    bookingOrTelegram.customerTelegramUserId,
  )
  return { ...payload, customerTelegramUserId }
}
