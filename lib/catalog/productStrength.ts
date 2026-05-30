import type { Product, ProductCategory } from '@/lib/mock-data'
import { parseStrengthMg } from '@/lib/mock-data'

const STRENGTH_CATEGORIES = new Set<ProductCategory>(['liquid', 'snus'])

export const MG_MIN = 1
export const MG_MAX = 150

export function categoryUsesStrengthFilter(category: ProductCategory): boolean {
  return STRENGTH_CATEGORIES.has(category)
}

function isValidMg(n: number): boolean {
  return Number.isFinite(n) && n >= MG_MIN && n <= MG_MAX
}

function prepareStrengthSource(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

const MG_SUFFIX =
  String.raw `(?:m\s*g|м\s*г)(?:\s*\/\s*(?:m\s*l|м\s*л))?`

const STRENGTH_PATTERNS: RegExp[] = [
  new RegExp(String.raw `(?<!\d)(\d{1,3})\s*[-_/.,]?\s*${MG_SUFFIX}`, 'gi'),
  new RegExp(String.raw `(?<!\d)(\d{1,3})${MG_SUFFIX}`, 'gi'),
]

export function extractStrengthMgValues(text: string): number[] {
  if (!text.trim()) return []

  const source = prepareStrengthSource(text)
  const result = new Set<number>()

  for (const pattern of STRENGTH_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      const n = parseInt(match[1] ?? '', 10)
      if (isValidMg(n)) result.add(n)
    }
  }

  return Array.from(result).sort((a, b) => a - b)
}

export function getProductStrengthValues(
  product: Pick<Product, 'brand' | 'strength' | 'specification' | 'category'>,
): number[] {
  if (!categoryUsesStrengthFilter(product.category)) return []

  const values = new Set<number>()
  for (const n of extractStrengthMgValues(product.brand)) values.add(n)
  for (const n of extractStrengthMgValues(product.specification ?? '')) values.add(n)
  for (const n of extractStrengthMgValues(String(product.strength ?? ''))) values.add(n)

  const fromField = parseStrengthMg(product.strength)
  if (fromField != null && isValidMg(Math.round(fromField))) {
    values.add(Math.round(fromField))
  }

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
    if (parsed != null && isValidMg(Math.round(parsed))) {
      values.add(Math.round(parsed))
    }
  }
  return Array.from(values).sort((a, b) => a - b)
}
