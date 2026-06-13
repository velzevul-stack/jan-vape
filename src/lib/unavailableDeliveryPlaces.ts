const UNAVAILABLE_PLACE_PATTERN =
  /сант[аеуы]?|домашн|дом[\.\s]*магаз|хабз[аеуы]?|механизатор(?:ов)?\s*7|депутатск(?:ая|ой)\s*47|\bsanta\b|\bhabza\b/i

const UNAVAILABLE_ADDRESS_MARKERS = [
  'механизаторов 7',
  'депутатская 47',
]

export const UNAVAILABLE_DELIVERY_PLACE_MESSAGE =
  'Доставка на Санту, Хабзу и Домашний магазин не осуществляется. Выберите другой адрес.'

export function normalizeDeliveryPlaceText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
}

export function isUnavailableDeliveryPlace(...parts: Array<string | null | undefined>): boolean {
  const combined = parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
  if (!combined) return false
  const normalized = normalizeDeliveryPlaceText(combined)
  if (UNAVAILABLE_PLACE_PATTERN.test(normalized)) return true
  return UNAVAILABLE_ADDRESS_MARKERS.some((marker) => normalized.includes(marker))
}
