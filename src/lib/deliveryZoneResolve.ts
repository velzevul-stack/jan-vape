export interface DeliveryZoneLike {
  id: string
  code?: string
  name: string
  aliases: string[]
  roundTripMinutes: number
  deliveryFee: number
}

export const DEFAULT_DELIVERY_ZONE_CODE = 'ivatevichi'

function getDefaultDeliveryZone(zones: DeliveryZoneLike[]): DeliveryZoneLike | null {
  return (
    zones.find((zone) => zone.code === DEFAULT_DELIVERY_ZONE_CODE)
    ?? zones.find((zone) => normalize(zone.name) === normalize('Ивацевичи'))
    ?? zones[0]
    ?? null
  )
}

export type DeliveryResolveConfidence = 'exact' | 'fuzzy' | 'none'

export interface DeliveryZoneResolveResult {
  zoneId: string
  zoneName: string
  deliveryFee: number
  roundTripMinutes: number
  addressDetail: string
  displayAddress: string
  confidence: DeliveryResolveConfidence
  candidates: Array<{ zoneId: string; zoneName: string; score: number }>
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

function tokenVariants(zone: DeliveryZoneLike): string[] {
  const values = [zone.name, ...zone.aliases]
  return values.map(normalize).filter(Boolean)
}

function stripZoneFromText(text: string, variant: string): string {
  const normalizedText = normalize(text)
  const index = normalizedText.indexOf(variant)
  if (index < 0) {
    return text.trim()
  }
  const raw = text.trim()
  const lowerRaw = raw.toLowerCase()
  const lowerVariant = variant.toLowerCase()
  const rawIndex = lowerRaw.indexOf(lowerVariant)
  if (rawIndex < 0) {
    return text.trim()
  }
  const before = raw.slice(0, rawIndex).trim()
  const after = raw.slice(rawIndex + lowerVariant.length).trim()
  const detail = [before, after].filter(Boolean).join(' ').replace(/^[,;-]+|[,;-]+$/g, '').trim()
  return detail
}

function fuzzyThreshold(variant: string): number {
  if (variant.length <= 4) return 1
  if (variant.length <= 7) return 2
  return 2
}

export function resolveDeliveryZone(
  text: string,
  zones: DeliveryZoneLike[],
): DeliveryZoneResolveResult | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const normalizedText = normalize(trimmed)
  const matches: Array<{ zone: DeliveryZoneLike; variant: string; score: number; exact: boolean }> = []

  for (const zone of zones) {
    for (const variant of tokenVariants(zone)) {
      if (normalizedText.includes(variant)) {
        matches.push({ zone, variant, score: 100, exact: true })
        continue
      }
      const words = normalizedText.split(' ')
      for (const word of words) {
        if (word.length < 3) continue
        const distance = levenshtein(word, variant)
        if (distance <= fuzzyThreshold(variant)) {
          matches.push({ zone, variant, score: 80 - distance * 10, exact: false })
        }
      }
    }
  }

  if (matches.length === 0) {
    const defaultZone = getDefaultDeliveryZone(zones)
    if (defaultZone) {
      const addressDetail = trimmed
      return {
        zoneId: defaultZone.id,
        zoneName: defaultZone.name,
        deliveryFee: Number(defaultZone.deliveryFee),
        roundTripMinutes: defaultZone.roundTripMinutes,
        addressDetail,
        displayAddress: addressDetail
          ? `${defaultZone.name}, ${addressDetail}`
          : defaultZone.name,
        confidence: 'none',
        candidates: [],
      }
    }
    return {
      zoneId: '',
      zoneName: '',
      deliveryFee: 0,
      roundTripMinutes: 0,
      addressDetail: trimmed,
      displayAddress: trimmed,
      confidence: 'none',
      candidates: [],
    }
  }

  matches.sort((a, b) => b.score - a.score)
  const best = matches[0]
  const addressDetail = stripZoneFromText(trimmed, best.variant)
  const displayAddress = addressDetail ? `${best.zone.name}, ${addressDetail}` : best.zone.name
  const candidateMap = new Map<string, { zoneId: string; zoneName: string; score: number }>()
  for (const match of matches) {
    const existing = candidateMap.get(match.zone.id)
    if (!existing || existing.score < match.score) {
      candidateMap.set(match.zone.id, {
        zoneId: match.zone.id,
        zoneName: match.zone.name,
        score: match.score,
      })
    }
  }

  return {
    zoneId: best.zone.id,
    zoneName: best.zone.name,
    deliveryFee: Number(best.zone.deliveryFee),
    roundTripMinutes: best.zone.roundTripMinutes,
    addressDetail,
    displayAddress,
    confidence: best.exact ? 'exact' : 'fuzzy',
    candidates: Array.from(candidateMap.values()).sort((a, b) => b.score - a.score).slice(0, 3),
  }
}
