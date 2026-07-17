const UNAVAILABLE_PLACE_PATTERN =
  /сант[аеуы]?|домашн|дом[\.\s]*магаз|хабз[аеуы]?|механизатор(?:ов)?\s*7|депутатск(?:ая|ой)\s*47|парк\s*возле\s*евроопта|евроопт\s*парковая|парковая\s*2|бич\s*двор|\bsanta\b|\bhabza\b/i

const UNAVAILABLE_ADDRESS_MARKERS = [
  'механизаторов 7',
  'депутатская 47',
  'парк возле евроопта',
  'парковая 2',
  'евроопт парковая',
  'бич двор',
]

export const UNAVAILABLE_DELIVERY_PLACE_MESSAGE =
  'Доставка на Санту, Хабзу, Домашний магазин, парк возле Евроопта, Парковую 2 и бич-двор не осуществляется. Выберите другой адрес.'

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
