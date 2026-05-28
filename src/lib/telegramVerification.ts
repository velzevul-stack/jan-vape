import type { NextRequest } from 'next/server'
import { getRepo } from './db'
import { telegramLookupKey } from './telegramBooking'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { tgSessionCookieName, telegramMatchesSession, verifyTgSession } from './tgSession'

export async function isTelegramVerified(
  customerTelegram: string,
  req?: NextRequest,
): Promise<boolean> {
  const session = req ? verifyTgSession(req.cookies.get(tgSessionCookieName())?.value) : null
  if (session && telegramMatchesSession(session, customerTelegram)) {
    return true
  }

  const lookupKey = telegramLookupKey(normalizeTelegramUsername(customerTelegram))
  const customerRepo = await getRepo('TelegramCustomer')
  const customer = await customerRepo.findOne({ where: { telegramUsername: lookupKey } })
  return Boolean(customer?.verifiedAt)
}

export async function isSessionVerified(req: NextRequest): Promise<boolean> {
  return Boolean(verifyTgSession(req.cookies.get(tgSessionCookieName())?.value))
}
