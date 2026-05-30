import type { Product, ProductCategory } from '@/lib/mock-data'
import { parseStrengthMg } from '@/lib/mock-data'

const STRENGTH_CATEGORIES = new Set<ProductCategory>(['liquid', 'snus'])

export function categoryUsesStrengthFilter(category: ProductCategory): boolean {
  return STRENGTH_CATEGORIES.has(category)
}

export function extractStrengthMgValues(text: string): number[] {
  if (!text.trim()) return []
  const normalized = text.toLowerCase()
  const regex =
    /(?<!\d)(\d{1,3})\s*[-_/.,]?\s*(?:m\s*g|м\s*г)(?![A-Za-zА-Яа-яЁё0-9_])/g
  const result = new Set<number>()
  for (const match of normalized.matchAll(regex)) {
    const n = parseInt(match[1] ?? '', 10)
    if (n >= 1 && n <= 99) result.add(n)
  }
  return Array.from(result)
}

export function getProductStrengthValues(
  product: Pick<Product, 'brand' | 'strength' | 'specification' | 'category'>,
): number[] {
  if (!categoryUsesStrengthFilter(product.category)) return []

  const values = new Set<number>()
  for (const n of extractStrengthMgValues(product.brand)) values.add(n)
  for (const n of extractStrengthMgValues(product.specification ?? '')) values.add(n)

  const fromField = parseStrengthMg(product.strength)
  if (fromField != null && fromField >= 1 && fromField <= 99) {
    values.add(Math.round(fromField))
  }
  for (const n of extractStrengthMgValues(String(product.strength ?? ''))) values.add(n)

  return Array.from(values).sort((a, b) => a - b)
}

export function getPrimaryProductStrengthMg(
  product: Pick<Product, 'brand' | 'strength' | 'specification' | 'category'>,
): number | null {
  const values = getProductStrengthValues(product)
  return values.length > 0 ? values[0]! : null
}

export function productMatchesStrengthFilter(
  product: Pick<Product, 'brand' | 'strength' | 'specification' | 'category'>,
  selected: ReadonlySet<number>,
): boolean {
  if (selected.size === 0) return true
  if (!categoryUsesStrengthFilter(product.category)) return true
  const values = getProductStrengthValues(product)
  return values.some((mg) => selected.has(mg))
}

export function collectStrengthOptions(
  products: readonly Pick<Product, 'brand' | 'strength' | 'specification' | 'category'>[],
  extraRawValues: readonly string[] = [],
): number[] {
  const values = new Set<number>()
  for (const p of products) {
    for (const mg of getProductStrengthValues(p)) values.add(mg)
  }
  for (const raw of extraRawValues) {
    for (const mg of extractStrengthMgValues(raw)) values.add(mg)
    const parsed = parseStrengthMg(raw)
    if (parsed != null && parsed >= 1 && parsed <= 99) values.add(Math.round(parsed))
  }
  return Array.from(values).sort((a, b) => a - b)
}
