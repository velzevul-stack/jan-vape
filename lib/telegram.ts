/** Telegram @username: 5–32 chars, starts with letter. */
const TELEGRAM_USERNAME_RE = /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/

export function normalizeTelegramUsername(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

export function isValidTelegramUsername(value: string): boolean {
  const normalized = normalizeTelegramUsername(value)
  if (!normalized) return false
  return TELEGRAM_USERNAME_RE.test(normalized)
}
