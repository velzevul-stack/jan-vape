import { isValidTelegramUsername, normalizeTelegramUsername } from '@/lib/telegram'

const USERNAME_TOKEN_RE = /@([a-zA-Z][a-zA-Z0-9_]{4,31})/g

export function parseTelegramFromText(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (isValidTelegramUsername(trimmed)) {
    return normalizeTelegramUsername(trimmed)
  }

  const matches = [...trimmed.matchAll(USERNAME_TOKEN_RE)]
  if (matches.length === 0) return null

  const last = matches[matches.length - 1][1]
  const candidate = normalizeTelegramUsername(last)
  return isValidTelegramUsername(candidate) ? candidate : null
}
