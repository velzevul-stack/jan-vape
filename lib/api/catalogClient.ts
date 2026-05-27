import type { Product } from '@/lib/mock-data'

export interface CatalogResponse {
  products: Product[]
  strengthValues?: string[]
}

export async function fetchCatalogFresh(): Promise<CatalogResponse> {
  const res = await fetch('/api/catalog', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status}`)
  }
  return res.json() as Promise<CatalogResponse>
}

export function resolveCartLinesAgainstCatalog(
  items: Array<{ product: Product; quantity: number }>,
  products: Product[],
): {
  lines: Array<{ product: Product; quantity: number }>
  removed: Product[]
  adjusted: Array<{ product: Product; from: number; to: number }>
} {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const lines: Array<{ product: Product; quantity: number }> = []
  const removed: Product[] = []
  const adjusted: Array<{ product: Product; from: number; to: number }> = []

  for (const item of items) {
    const fresh = productMap.get(item.product.id)
    if (!fresh || (fresh.availableOnPost ?? 0) <= 0) {
      removed.push(item.product)
      continue
    }
    const maxQty = fresh.availableOnPost ?? 0
    const qty = Math.min(item.quantity, maxQty)
    if (qty <= 0) {
      removed.push(item.product)
      continue
    }
    if (qty !== item.quantity) {
      adjusted.push({ product: fresh, from: item.quantity, to: qty })
    }
    lines.push({ product: fresh, quantity: qty })
  }

  return { lines, removed, adjusted }
}
