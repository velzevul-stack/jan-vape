import type { DeliveryZoneOption } from '@/lib/api/hooks/useDeliveryZones'

export const DEFAULT_DELIVERY_ZONE_CODE = 'ivatevichi'

export function getDefaultDeliveryZone(
  zones: DeliveryZoneOption[],
): DeliveryZoneOption | null {
  return (
    zones.find((zone) => zone.code === DEFAULT_DELIVERY_ZONE_CODE) ?? zones[0] ?? null
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/["«»']/g, '')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i++) matrix[i][0] = i
  for (let j = 0; j < cols; j++) matrix[0][j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[rows - 1][cols - 1]
}

function fuzzyThreshold(variant: string): number {
  if (variant.length <= 4) return 1
  if (variant.length <= 7) return 2
  return 2
}

function findBestZoneMatch(
  token: string,
  zones: DeliveryZoneOption[],
): DeliveryZoneOption | null {
  const norm = normalize(token)
  if (!norm || norm.length < 2) return null

  let best: { zone: DeliveryZoneOption; distance: number } | null = null
  for (const zone of zones) {
    const variant = normalize(zone.name)
    if (norm === variant) return zone
    const distance = levenshtein(norm, variant)
    const threshold = fuzzyThreshold(variant)
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { zone, distance }
    }
  }
  return best?.zone ?? null
}

function cleanupAddressDetail(value: string): string {
  return value
    .replace(/^[,;\s]+|[,;\s]+$/g, '')
    .replace(/[,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function correctSettlementInAddress(
  text: string,
  zones: DeliveryZoneOption[],
): string {
  const trimmed = text.trim()
  if (!trimmed || zones.length === 0) return text

  const commaIndex = trimmed.indexOf(',')
  const prefix = (commaIndex >= 0 ? trimmed.slice(0, commaIndex) : trimmed).trim()
  const suffix = commaIndex >= 0 ? trimmed.slice(commaIndex) : ''

  const matched = findBestZoneMatch(prefix, zones)
  if (!matched) return text

  const correctedPrefix = matched.name
  if (prefix === correctedPrefix) return text
  return `${correctedPrefix}${suffix}`
}

export function stripKnownZones(text: string, zones: DeliveryZoneOption[]): string {
  let remaining = text.trim()
  if (!remaining) return ''

  const zoneNames = [...zones]
    .map((zone) => zone.name.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  for (const name of zoneNames) {
    const escaped = escapeRegExp(name)
    remaining = remaining
      .replace(new RegExp(`^${escaped}$`, 'iu'), ' ')
      .replace(new RegExp(`^${escaped}(?:\\s*,\\s*|\\s+)`, 'iu'), '')
      .replace(new RegExp(`(?:\\s*,\\s*|\\s+)${escaped}$`, 'iu'), '')
      .replace(new RegExp(`(?:\\s*,\\s*|\\s+)${escaped}(?=\\s*,|\\s|$)`, 'iu'), ' ')
      .trim()
  }

  return cleanupAddressDetail(remaining)
}

export function buildAddressWithZone(
  query: string,
  zone: DeliveryZoneOption,
  zones: DeliveryZoneOption[],
): string {
  const normalized = correctSettlementInAddress(query, zones)
  const detail = stripKnownZones(normalized, zones)
  if (!detail) return zone.name
  return `${zone.name}, ${detail}`
}

export function resolveZoneFromAddressPrefix(
  text: string,
  zones: DeliveryZoneOption[],
): DeliveryZoneOption | null {
  const corrected = correctSettlementInAddress(text, zones)
  const commaIndex = corrected.indexOf(',')
  const prefix = (commaIndex >= 0 ? corrected.slice(0, commaIndex) : corrected).trim()
  return findBestZoneMatch(prefix, zones)
}

function findZoneExplicitInText(
  text: string,
  zones: DeliveryZoneOption[],
): DeliveryZoneOption | null {
  const normalizedText = normalize(text)
  const sorted = [...zones].sort((a, b) => b.name.length - a.name.length)
  for (const zone of sorted) {
    const variant = normalize(zone.name)
    if (variant && normalizedText.includes(variant)) {
      return zone
    }
  }
  return null
}

function resolveSettlementPrefixZone(
  prefix: string,
  zones: DeliveryZoneOption[],
): DeliveryZoneOption | null {
  const matched = findBestZoneMatch(prefix, zones)
  if (!matched) return null
  const normPrefix = normalize(prefix)
  const normName = normalize(matched.name)
  if (normPrefix === normName) return matched
  if (levenshtein(normPrefix, normName) <= fuzzyThreshold(normName)) return matched
  return null
}

export function ensureDeliveryAddressWithZone(
  text: string,
  zones: DeliveryZoneOption[],
): { address: string; zone: DeliveryZoneOption | null } {
  const trimmed = text.trim()
  if (!trimmed || zones.length === 0) {
    return { address: trimmed, zone: null }
  }

  const defaultZone = getDefaultDeliveryZone(zones)
  const corrected = correctSettlementInAddress(trimmed, zones)
  const explicitInText = findZoneExplicitInText(corrected, zones)
  if (explicitInText) {
    const detail = stripKnownZones(corrected, zones)
    const address = detail ? `${explicitInText.name}, ${detail}` : explicitInText.name
    return {
      address: correctSettlementInAddress(address, zones),
      zone: explicitInText,
    }
  }

  const commaIndex = corrected.indexOf(',')
  const prefix = (commaIndex >= 0 ? corrected.slice(0, commaIndex) : corrected).trim()
  const prefixZone = resolveSettlementPrefixZone(prefix, zones)
  if (prefixZone) {
    return { address: corrected, zone: prefixZone }
  }

  if (!defaultZone) {
    return { address: corrected, zone: null }
  }

  const detail = stripKnownZones(corrected, zones) || corrected
  return {
    address: detail ? `${defaultZone.name}, ${detail}` : defaultZone.name,
    zone: defaultZone,
  }
}

export function stripDefaultZoneFromPlaceLabel(
  label: string,
  zoneName: string | null | undefined,
): string {
  if (!zoneName || zoneName !== 'Ивацевичи') return label
  const trimmed = label.trim()
  const zoneLower = zoneName.toLowerCase()
  const lower = trimmed.toLowerCase()
  if (lower.startsWith(`${zoneLower},`)) {
    return trimmed.slice(zoneName.length + 1).trim()
  }
  if (lower.startsWith(`${zoneLower} `)) {
    return trimmed.slice(zoneName.length).trim()
  }
  if (lower === zoneLower) return ''
  return trimmed
}
