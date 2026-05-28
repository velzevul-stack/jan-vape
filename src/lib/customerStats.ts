import { normalizeTelegramUsername } from '@/lib/telegram'
import type { CancelledFromStatus, WebBooking } from '@/src/entities/WebBooking'
import type { TelegramCustomer } from '@/src/entities/TelegramCustomer'
import { getRepo } from './db'
import { telegramLookupKey } from './telegramBooking'
import { ensureTelegramCustomer } from './telegramCustomer'

export type TrustLevel = 'blue' | 'red' | 'orange' | 'green'

export interface CustomerStats {
  telegramUsername: string
  trustLevel: TrustLevel
  completedCount: number
  lateCancelCount: number
  earlyCancelCount: number
  consecutiveCompleted: number
  verified: boolean
  trusted: boolean
  blocked: boolean
  warnings: string[]
}

export function computeTrustLevel(input: {
  completedCount: number
  lateCancelCount: number
  consecutiveCompleted: number
}): TrustLevel {
  const { completedCount, lateCancelCount, consecutiveCompleted } = input

  if (completedCount === 0 && lateCancelCount === 0) {
    return 'blue'
  }
  if (completedCount === 0 && lateCancelCount >= 1) {
    return 'red'
  }
  if (completedCount >= 1 && lateCancelCount >= 1) {
    return 'orange'
  }
  if (
    (completedCount === 1 && lateCancelCount === 0) ||
    consecutiveCompleted >= 3
  ) {
    return 'green'
  }
  return 'blue'
}

export function computeBookingHistoryStats(
  bookings: Array<Pick<WebBooking, 'status' | 'cancelledFromStatus' | 'createdAt'>>,
): Pick<
  CustomerStats,
  'completedCount' | 'lateCancelCount' | 'earlyCancelCount' | 'consecutiveCompleted' | 'trustLevel'
> {
  const sorted = [...bookings].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )

  let completedCount = 0
  let lateCancelCount = 0
  let earlyCancelCount = 0
  let consecutiveCompleted = 0
  let maxConsecutiveCompleted = 0

  for (const booking of sorted) {
    if (booking.status === 'completed') {
      completedCount += 1
      consecutiveCompleted += 1
      maxConsecutiveCompleted = Math.max(maxConsecutiveCompleted, consecutiveCompleted)
      continue
    }

    if (booking.status !== 'cancelled') {
      continue
    }

    const fromStatus = booking.cancelledFromStatus ?? 'pending'
    if (fromStatus === 'confirmed') {
      lateCancelCount += 1
      consecutiveCompleted = 0
    } else {
      earlyCancelCount += 1
    }
  }

  const trustLevel = computeTrustLevel({
    completedCount,
    lateCancelCount,
    consecutiveCompleted: maxConsecutiveCompleted,
  })

  return {
    completedCount,
    lateCancelCount,
    earlyCancelCount,
    consecutiveCompleted: maxConsecutiveCompleted,
    trustLevel,
  }
}

export function resolveCancelledFromStatus(
  currentStatus: WebBooking['status'],
): CancelledFromStatus {
  return currentStatus === 'confirmed' ? 'confirmed' : 'pending'
}

export async function getCustomerStatsForTelegram(
  customerTelegram: string,
): Promise<CustomerStats> {
  const normalized = normalizeTelegramUsername(customerTelegram)
  const lookupKey = telegramLookupKey(normalized)

  const bookingRepo = await getRepo('WebBooking')
  const bookings = await bookingRepo
    .createQueryBuilder('wb')
    .where('LOWER(wb.customerTelegram) = :tg', { tg: lookupKey })
    .orderBy('wb.createdAt', 'ASC')
    .getMany()

  const customerRepo = await getRepo('TelegramCustomer')
  const customer = await customerRepo.findOne({
    where: { telegramUsername: lookupKey },
  })

  const history = computeBookingHistoryStats(bookings)
  const warnings: string[] = []

  if (!customer?.verifiedAt) {
    warnings.push('tg_unverified')
  }
  if (customer?.blockedAt) {
    warnings.push('blocked')
  }

  return {
    telegramUsername: normalized,
    trustLevel: history.trustLevel,
    completedCount: history.completedCount,
    lateCancelCount: history.lateCancelCount,
    earlyCancelCount: history.earlyCancelCount,
    consecutiveCompleted: history.consecutiveCompleted,
    verified: Boolean(customer?.verifiedAt),
    trusted: Boolean(customer?.trustedAt) || history.completedCount > 0,
    blocked: Boolean(customer?.blockedAt),
    warnings,
  }
}

export async function getCustomerStatsMap(
  telegrams: string[],
): Promise<Map<string, CustomerStats>> {
  const unique = Array.from(
    new Set(
      telegrams
        .map((value) => normalizeTelegramUsername(value))
        .filter((value) => value.length > 0),
    ),
  )

  const entries = await Promise.all(
    unique.map(async (telegram) => [telegramLookupKey(telegram), await getCustomerStatsForTelegram(telegram)] as const),
  )

  return new Map(entries)
}

export async function markCustomerTrusted(customerTelegram: string): Promise<void> {
  const customer = await ensureTelegramCustomer(customerTelegram)
  if (customer.trustedAt) {
    return
  }
  const repo = await getRepo('TelegramCustomer')
  await repo.update(customer.id, { trustedAt: new Date() })
}

export function trustLevelLabel(level: TrustLevel): string {
  switch (level) {
    case 'green':
      return 'Надёжный'
    case 'orange':
      return 'Были отмены после подтверждения'
    case 'red':
      return 'Не покупал, срывал подтверждённые брони'
    default:
      return 'Новый клиент'
  }
}

export function trustLevelEmoji(level: TrustLevel): string {
  switch (level) {
    case 'green':
      return '🟢'
    case 'orange':
      return '🟠'
    case 'red':
      return '🔴'
    default:
      return '🔵'
  }
}

export function formatCustomerWarnings(stats: CustomerStats): string[] {
  const lines: string[] = []
  if (stats.warnings.includes('tg_unverified')) {
    lines.push('⚠️ TG не подтверждён')
  }
  if (stats.warnings.includes('blocked')) {
    lines.push('🚫 Клиент заблокирован')
  }
  return lines
}

export type { TelegramCustomer }

export interface CustomerListItem {
  id: string
  telegramUsername: string
  verified: boolean
  trusted: boolean
  blocked: boolean
  blockedReason: string | null
  stats: CustomerStats
}

export async function listCustomers(options: {
  limit?: number
  offset?: number
  search?: string | null
}): Promise<{ customers: CustomerListItem[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50)
  const offset = Math.max(options.offset ?? 0, 0)
  const search = options.search?.trim().toLowerCase() ?? ''

  const customerRepo = await getRepo('TelegramCustomer')
  const qb = customerRepo.createQueryBuilder('tc')

  if (search) {
    qb.where('LOWER(tc.telegramUsername) LIKE :search', { search: `%${search}%` })
  }

  const total = await qb.getCount()
  const rows = await qb
    .orderBy('tc.updatedAt', 'DESC')
    .skip(offset)
    .take(limit)
    .getMany()

  if (rows.length === 0) {
    return { customers: [], total }
  }

  const lookupKeys = rows.map((row) => row.telegramUsername)
  const bookingRepo = await getRepo('WebBooking')
  const bookings = await bookingRepo
    .createQueryBuilder('wb')
    .where('LOWER(wb.customerTelegram) IN (:...keys)', { keys: lookupKeys })
    .orderBy('wb.createdAt', 'ASC')
    .getMany()

  const bookingsByTelegram = new Map<string, typeof bookings>()
  for (const booking of bookings) {
    const key = telegramLookupKey(booking.customerTelegram)
    const bucket = bookingsByTelegram.get(key) ?? []
    bucket.push(booking)
    bookingsByTelegram.set(key, bucket)
  }

  const customers = rows.map((row) => {
    const history = computeBookingHistoryStats(bookingsByTelegram.get(row.telegramUsername) ?? [])
    const warnings: string[] = []
    if (!row.verifiedAt) warnings.push('tg_unverified')
    if (row.blockedAt) warnings.push('blocked')

    const stats: CustomerStats = {
      telegramUsername: normalizeTelegramUsername(row.telegramUsername),
      trustLevel: history.trustLevel,
      completedCount: history.completedCount,
      lateCancelCount: history.lateCancelCount,
      earlyCancelCount: history.earlyCancelCount,
      consecutiveCompleted: history.consecutiveCompleted,
      verified: Boolean(row.verifiedAt),
      trusted: Boolean(row.trustedAt) || history.completedCount > 0,
      blocked: Boolean(row.blockedAt),
      warnings,
    }

    return {
      id: row.id,
      telegramUsername: stats.telegramUsername,
      verified: stats.verified,
      trusted: stats.trusted,
      blocked: stats.blocked,
      blockedReason: row.blockedReason,
      stats,
    }
  })

  return { customers, total }
}

export async function getCustomerById(customerId: string): Promise<CustomerListItem | null> {
  const customerRepo = await getRepo('TelegramCustomer')
  const row = await customerRepo.findOne({ where: { id: customerId } })
  if (!row) return null

  const stats = await getCustomerStatsForTelegram(row.telegramUsername)
  return {
    id: row.id,
    telegramUsername: stats.telegramUsername,
    verified: stats.verified,
    trusted: stats.trusted,
    blocked: stats.blocked,
    blockedReason: row.blockedReason,
    stats,
  }
}
