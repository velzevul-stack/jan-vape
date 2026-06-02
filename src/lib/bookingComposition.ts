export type BookingCompositionItem = {
  brand: string
  flavor: string
  quantity: number
  price: number
}

export function mapBookingProductLines(
  items: Array<{ productId: string; quantity: number; retailPriceSnapshot: number }>,
  productMap: Map<string, { brand: string; flavor: string }>,
): BookingCompositionItem[] {
  return items.map((item) => {
    const product = productMap.get(item.productId)
    return {
      brand: product?.brand ?? '',
      flavor: product?.flavor ?? '',
      quantity: item.quantity,
      price: item.retailPriceSnapshot,
    }
  })
}

export function withDeliveryInComposition(
  items: BookingCompositionItem[],
  deliveryFee: number,
  deliveryZoneName?: string | null,
): BookingCompositionItem[] {
  const fee = Number(deliveryFee)
  if (!Number.isFinite(fee) || fee <= 0) {
    return items
  }
  const hasDelivery = items.some(
    (line) => line.brand.trim().toLowerCase() === 'доставка',
  )
  if (hasDelivery) {
    return items
  }
  const zoneLabel = deliveryZoneName?.trim() ?? ''
  return [
    ...items,
    {
      brand: 'Доставка',
      flavor: zoneLabel,
      quantity: 1,
      price: fee,
    },
  ]
}

export function compositionDisplayLabel(item: BookingCompositionItem): string {
  const brand = item.brand.trim()
  const flavor = item.flavor.trim()
  if (brand.toLowerCase() === 'доставка') {
    return flavor ? `Доставка (${flavor})` : 'Доставка'
  }
  const base = `${brand} ${flavor}`.trim()
  return base || 'товар'
}
