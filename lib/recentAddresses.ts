const STORAGE_KEY = 'vapestore-recent-addresses'
const MAX_RECENT = 8

export function isSpecificAddress(value: string): boolean {
  return /\d/.test(value.trim())
}

export function getRecentAddresses(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && isSpecificAddress(item))
  } catch {
    return []
  }
}

export function filterRecentAddresses(query: string): string[] {
  const needle = query.trim().toLowerCase()
  const items = getRecentAddresses()
  if (!needle) return items
  return items.filter((item) => item.toLowerCase().includes(needle))
}

export function addRecentAddress(value: string): void {
  const trimmed = value.trim()
  if (!isSpecificAddress(trimmed)) return
  if (typeof window === 'undefined') return
  const existing = getRecentAddresses().filter((item) => item !== trimmed)
  const next = [trimmed, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
