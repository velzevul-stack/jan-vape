import { createHmac, timingSafeEqual } from 'crypto'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { telegramLookupKey } from './telegramBooking'

const EXCHANGE_TTL_SEC = 120

export interface TgExchangePayload {
  typ: 'vx'
  u: string
  id: string | null
  exp: number
}

function secret(): string {
  const value = process.env.HMAC_SECRET ?? process.env.TG_SESSION_SECRET
  if (!value) {
    throw new Error('HMAC_SECRET is not configured')
  }
  return value
}

export function signTgExchange(input: {
  telegramUsername: string
  telegramUserId?: string | number | null
}): string {
  const payload: TgExchangePayload = {
    typ: 'vx',
    u: telegramLookupKey(normalizeTelegramUsername(input.telegramUsername)),
    id:
      input.telegramUserId === null || input.telegramUserId === undefined
        ? null
        : String(input.telegramUserId),
    exp: Math.floor(Date.now() / 1000) + EXCHANGE_TTL_SEC,
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret()).update(`vx:${body}`).digest('base64url')
  return `${body}.${sig}`
}

export function verifyTgExchange(raw: string | undefined | null): TgExchangePayload | null {
  if (!raw) return null
  const [body, sig] = raw.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret()).update(`vx:${body}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TgExchangePayload
    if (payload.typ !== 'vx' || !payload.u || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
