import { normalizeTelegramUsername } from '@/lib/telegram'
import type { WebBooking } from '@/src/entities/WebBooking'
import type { Repository } from 'typeorm'

export function telegramLookupKey(value: string): string {
  return normalizeTelegramUsername(value).toLowerCase()
}

export async function findBookingByTelegram(
  repo: Repository<WebBooking>,
  customerTelegram: string,
  options?: {
    since?: Date
    statuses?: string[]
  },
): Promise<WebBooking | null> {
  const key = telegramLookupKey(customerTelegram)
  const qb = repo
    .createQueryBuilder('wb')
    .where('LOWER(wb.customerTelegram) = :tg', { tg: key })

  if (options?.since) {
    qb.andWhere('wb.createdAt >= :since', { since: options.since.toISOString() })
  }
  if (options?.statuses?.length) {
    qb.andWhere('wb.status IN (:...statuses)', { statuses: options.statuses })
  }

  return qb.orderBy('wb.createdAt', 'DESC').limit(1).getOne()
}
