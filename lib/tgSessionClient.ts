import { normalizeTelegramUsername } from '@/lib/telegram'

export const UNVERIFIED_MAX_CART_QUANTITY = 5

export type TgSessionInfo = {
  verified: boolean
  customerTelegram?: string
  maxCartQuantity: number | null
}

function cleanUrlParams(keys: string[]): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (!changed) return
  const search = url.searchParams.toString()
  const next = url.pathname + (search ? `?${search}` : '') + url.hash
  window.history.replaceState({}, '', next)
}

function mapSession(data: Record<string, unknown> | null): TgSessionInfo {
  if (!data?.verified) {
    return {
      verified: false,
      maxCartQuantity:
        typeof data?.maxCartQuantity === 'number' ? data.maxCartQuantity : UNVERIFIED_MAX_CART_QUANTITY,
    }
  }
  const tg =
    typeof data.customerTelegram === 'string' ? normalizeTelegramUsername(data.customerTelegram) : ''
  return {
    verified: true,
    customerTelegram: tg || undefined,
    maxCartQuantity:
      typeof data.maxCartQuantity === 'number' ? data.maxCartQuantity : null,
  }
}

export async function fetchTgSession(): Promise<TgSessionInfo> {
  if (typeof window === 'undefined') {
    return { verified: false, maxCartQuantity: UNVERIFIED_MAX_CART_QUANTITY }
  }

  const params = new URLSearchParams(window.location.search)
  const vx = params.get('vx')?.trim()
  if (vx) {
    try {
      const resp = await fetch('/api/tg/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchange: vx }),
      })
      if (resp.ok) {
        cleanUrlParams(['vx', 'tg', 'verified'])
        return mapSession((await resp.json()) as Record<string, unknown>)
      }
    } catch {
    }
  }

  const tgRaw = params.get('tg')?.trim()
  const sessionUrl = tgRaw
    ? `/api/tg/session?tg=${encodeURIComponent(normalizeTelegramUsername(decodeURIComponent(tgRaw)))}`
    : '/api/tg/session'

  try {
    const resp = await fetch(sessionUrl)
    const data = resp.ok ? ((await resp.json()) as Record<string, unknown>) : null
    const info = mapSession(data)
    if (info.verified && tgRaw) {
      cleanUrlParams(['tg', 'verified'])
    }
    return info
  } catch {
    return { verified: false, maxCartQuantity: UNVERIFIED_MAX_CART_QUANTITY }
  }
}
