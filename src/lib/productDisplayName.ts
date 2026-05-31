import type { ProductSnapshot } from '../entities/ProductSnapshot'

export function productDisplayName(
  p: Pick<ProductSnapshot, 'brand' | 'flavor' | 'category' | 'strength'>,
): string {
  const brand = p.brand.trim()
  const flavor = p.flavor.trim()
  if (p.category === 'system') return brand || flavor
  if (p.category === 'vape') {
    if (flavor && flavor.toLowerCase() !== brand.toLowerCase()) {
      return `${brand} - ${flavor}`
    }
    return brand
  }
  if (flavor && flavor.toLowerCase() !== brand.toLowerCase()) {
    return `${brand} - ${flavor}`
  }
  return brand
}
