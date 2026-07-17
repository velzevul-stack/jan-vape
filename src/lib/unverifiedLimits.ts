import type { NextRequest } from 'next/server'
import { getRepo } from './db'
import { telegramLookupKey } from './telegramBooking'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { isTelegramVerified } from './telegramVerification'

export const UNVERIFIED_MAX_ACTIVE_BOOKINGS = 1

export async function countActiveBookingsForTelegram(customerTelegram: string): Promise<number> {
  const lookupKey = telegramLookupKey(normalizeTelegramUsername(customerTelegram))
  const bookingRepo = await getRepo('WebBooking')
  return bookingRepo
    .createQueryBuilder('wb')
    .where('LOWER(wb.customerTelegram) = :tg', { tg: lookupKey })
    .andWhere('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
    .getCount()
}

export async function assertUnverifiedBookingAllowed(
  customerTelegram: string,
  req: NextRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (await isTelegramVerified(customerTelegram, req)) {
    return { ok: true }
  }

  const activeCount = await countActiveBookingsForTelegram(customerTelegram)
  if (activeCount >= UNVERIFIED_MAX_ACTIVE_BOOKINGS) {
    return {
      ok: false,
      message:
        'Для неподтверждённого Telegram можно иметь только одну активную бронь. Подтвердите Telegram или дождитесь завершения текущей брони.',
    }
  }

  return { ok: true }
}
