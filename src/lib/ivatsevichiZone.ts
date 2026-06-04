export const IVATSEVICHI_ZONE_CODE = 'ivatevichi'

export function isIvatsevichiDeliveryZone(zone: {
  code?: string
  name: string
}): boolean {
  if (zone.code === IVATSEVICHI_ZONE_CODE) return true
  const normalized = zone.name.toLowerCase().replace(/ё/g, 'е').trim()
  return normalized === 'ивцевичи' || normalized === 'город'
}
