import { normalizeTelegramUsername } from '@/lib/telegram'
import { getRepo } from './db'
import { enqueueNotification } from './notifier'
import { telegramLookupKey } from './telegramBooking'
import { ensureTelegramCustomer } from './telegramCustomer'

function joinUserbotEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}

async function notifyUserbotCustomerBlock(
  telegramUsername: string,
  blocked: boolean,
): Promise<void> {
  const userbotBase = process.env.NOTIFY_USERBOT_URL
  if (!userbotBase) return

  const endpoint = joinUserbotEndpoint(
    userbotBase,
    blocked ? '/events/block-user' : '/events/unblock-user',
  )
  const payload = {
    type: blocked ? 'block_user' : 'unblock_user',
    username: normalizeTelegramUsername(telegramUsername),
  }
  try {
    await enqueueNotification(endpoint, payload)
  } catch (err) {
    console.error('[telegramCustomer] userbot block notify failed', err)
  }
}

export async function blockTelegramCustomer(
  customerTelegram: string,
  reason?: string | null,
): Promise<void> {
  const lookupKey = telegramLookupKey(customerTelegram)
  const customer = await ensureTelegramCustomer(customerTelegram)
  const repo = await getRepo('TelegramCustomer')

  await repo.update(customer.id, {
    blockedAt: new Date(),
    blockedReason: reason?.trim() || null,
  })

  await notifyUserbotCustomerBlock(lookupKey, true)
}

export async function unblockTelegramCustomer(customerTelegram: string): Promise<void> {
  const lookupKey = telegramLookupKey(customerTelegram)
  const customer = await ensureTelegramCustomer(customerTelegram)
  const repo = await getRepo('TelegramCustomer')

  await repo.update(customer.id, {
    blockedAt: null,
    blockedReason: null,
  })

  await notifyUserbotCustomerBlock(lookupKey, false)
}
