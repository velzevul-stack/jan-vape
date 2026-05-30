import type { Product, ProductCategory } from '@/lib/mock-data'

export type TasteFilter = 'sweet' | 'sour' | 'cold'

const TASTE_CATEGORIES = new Set<ProductCategory>(['liquid', 'disposable'])

const TASTE_ALIASES: Record<TasteFilter, readonly string[]> = {
  sweet: ['sweet', 'сладк'],
  sour: ['sour', 'кисл'],
  cold: ['cold', 'холод', 'ice', 'лед', 'мороз'],
}

export function categorySupportsTasteFilter(category: ProductCategory): boolean {
  return TASTE_CATEGORIES.has(category)
}

export function productHasTaste(profile: string, taste: TasteFilter): boolean {
  const lower = (profile ?? '').toLowerCase()
  if (!lower.trim()) return false
  return TASTE_ALIASES[taste].some((alias) => lower.includes(alias))
}

export function getAvailableTasteFilters(
  products: readonly Pick<Product, 'category' | 'tasteProfile'>[],
): TasteFilter[] {
  const all: TasteFilter[] = ['sweet', 'sour', 'cold']
  return all.filter((taste) =>
    products.some(
      (p) => categorySupportsTasteFilter(p.category) && productHasTaste(p.tasteProfile, taste),
    ),
  )
}

export function productMatchesTasteFilters(
  product: Pick<Product, 'category' | 'tasteProfile'>,
  selected: ReadonlySet<TasteFilter>,
): boolean {
  if (selected.size === 0) return true
  if (!categorySupportsTasteFilter(product.category)) return false
  const profile = product.tasteProfile ?? ''
  if (!profile.trim()) return false
  return Array.from(selected).every((taste) => productHasTaste(profile, taste))
}
