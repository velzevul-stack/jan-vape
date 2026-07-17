import { normalizeTelegramUsername } from '@/lib/telegram'

const TG_SESSION_KEY = 'tg_verified_v1'

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

function saveTgToStorage(tg: string): void {
  try {
    sessionStorage.setItem(TG_SESSION_KEY, tg)
  } catch {}
}

function loadTgFromStorage(): string | null {
  try {
    return sessionStorage.getItem(TG_SESSION_KEY)
  } catch {
    return null
  }
}

function mapSession(data: Record<string, unknown> | null): TgSessionInfo {
  if (!data?.verified) {
    return {
      verified: false,
      maxCartQuantity: typeof data?.maxCartQuantity === 'number' ? data.maxCartQuantity : null,
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
    return { verified: false, maxCartQuantity: null }
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
        const info = mapSession((await resp.json()) as Record<string, unknown>)
        if (info.verified && info.customerTelegram) {
          saveTgToStorage(info.customerTelegram)
        }
        return info
      }
    } catch {
    }
  }

  const tgRaw = params.get('tg')?.trim()

  if (!tgRaw) {
    const cached = loadTgFromStorage()
    if (cached) {
      return { verified: true, customerTelegram: cached, maxCartQuantity: null }
    }
  }

  const sessionUrl = tgRaw
    ? `/api/tg/session?tg=${encodeURIComponent(normalizeTelegramUsername(decodeURIComponent(tgRaw)))}`
    : '/api/tg/session'

  try {
    const resp = await fetch(sessionUrl)
    const data = resp.ok ? ((await resp.json()) as Record<string, unknown>) : null
    const info = mapSession(data)
    if (info.verified) {
      if (tgRaw) cleanUrlParams(['tg', 'verified'])
      if (info.customerTelegram) saveTgToStorage(info.customerTelegram)
    }
    return info
  } catch {
    return { verified: false, maxCartQuantity: null }
  }
}
