const UNAVAILABLE_PLACE_PATTERN =
  /сант[аеуы]?|домашн(?:ий|ем|его|ему|им|ими)?\s*магаз|дом[\.\s]*магаз|хабз[аеуы]?|\bsanta\b|\bhabza\b/i

export const UNAVAILABLE_DELIVERY_PLACE_MESSAGE =
  'Доставка на Санту, Хабзу и Домашний магазин не осуществляется. Выберите другой адрес.'

export function normalizeDeliveryPlaceText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function isUnavailableDeliveryPlace(...parts: Array<string | null | undefined>): boolean {
  const combined = parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
  if (!combined) return false
  return UNAVAILABLE_PLACE_PATTERN.test(normalizeDeliveryPlaceText(combined))
}
