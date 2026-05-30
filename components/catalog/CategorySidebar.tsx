'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Droplet,
  Battery,
  Cpu,
  Leaf,
  Package,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Product, type ProductCategory, categoryLabels, categoryOrder } from '@/lib/mock-data'
import { slugifyForAnchor } from '@/lib/catalog/filterRules'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

const STORAGE_KEY_EXPANDED = 'catalog.sidebar.expanded'

const categoryIcons: Record<ProductCategory, React.ReactNode> = {
  liquid: <Droplet className="h-3.5 w-3.5" />,
  disposable: <Battery className="h-3.5 w-3.5" />,
  vape: <Cpu className="h-3.5 w-3.5" />,
  snus: <Leaf className="h-3.5 w-3.5" />,
  consumable: <Package className="h-3.5 w-3.5" />,
}

interface CategoryNode {
  category: ProductCategory
  count: number
  brands: BrandNode[]
}

interface BrandNode {
  brand: string
  count: number
  category: ProductCategory
}

export interface CategorySidebarProps {
  products: Product[]
  activeCategory: ProductCategory | 'all'
  activeBrand: string | null
  onSelectAll: () => void
  onSelectCategory: (category: ProductCategory) => void
  onSelectBrand: (category: ProductCategory, brand: string) => void
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

function buildTree(products: Product[]): CategoryNode[] {
  const map = new Map<ProductCategory, Map<string, number>>()
  for (const p of products) {
    if (!map.has(p.category)) map.set(p.category, new Map())
    const brands = map.get(p.category)!
    brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1)
  }
  const result: CategoryNode[] = []
  for (const category of categoryOrder) {
    const brands = map.get(category)
    if (!brands || brands.size === 0) continue
    const brandList: BrandNode[] = Array.from(brands.entries())
      .map(([brand, count]) => ({ brand, count, category }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.brand.localeCompare(b.brand)
      })
    const total = brandList.reduce((sum, b) => sum + b.count, 0)
    result.push({ category, count: total, brands: brandList })
  }
  return result
}

function readExpanded(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_EXPANDED)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

function writeExpanded(set: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify(Array.from(set)))
  } catch {
    return
  }
}

function smoothScrollTo(anchor: string) {
  if (typeof window === 'undefined') return
  setTimeout(() => {
    const el = document.getElementById(anchor)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 60)
}

function SidebarContent({
  tree,
  activeCategory,
  activeBrand,
  expanded,
  onToggleExpanded,
  onSelectAll,
  onSelectCategory,
  onSelectBrand,
  totalCount,
}: {
  tree: CategoryNode[]
  activeCategory: ProductCategory | 'all'
  activeBrand: string | null
  expanded: Set<string>
  onToggleExpanded: (category: ProductCategory) => void
  onSelectAll: () => void
  onSelectCategory: (category: ProductCategory) => void
  onSelectBrand: (category: ProductCategory, brand: string) => void
  totalCount: number
}) {
  return (
    <nav aria-label="Категории и бренды" className="space-y-1">
      <button
        type="button"
        onClick={onSelectAll}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
          activeCategory === 'all'
            ? 'bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/20'
            : 'text-text-on-dark hover:bg-card-inner',
        )}
      >
        <Layers className="h-4 w-4 shrink-0" />
        <span className="flex-1">Все товары</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
            activeCategory === 'all'
              ? 'bg-text-on-accent/15 text-text-on-accent'
              : 'bg-text-on-dark/10 text-text-muted',
          )}
        >
          {totalCount}
        </span>
      </button>

      <div className="mx-2 my-2 h-px bg-border-on-dark" aria-hidden />

      {tree.map((node) => {
        const isExpanded = expanded.has(node.category)
        const isCategoryActive = activeCategory === node.category && !activeBrand
        return (
          <div key={node.category}>
            <div
              className={cn(
                'group/cat flex items-center gap-1 rounded-xl pr-1.5 text-sm font-medium transition-colors',
                isCategoryActive
                  ? 'bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/20'
                  : 'text-text-on-dark hover:bg-card-inner',
              )}
            >
              <button
                type="button"
                onClick={() => onToggleExpanded(node.category)}
                aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                className={cn(
                  'flex h-9 w-8 shrink-0 items-center justify-center rounded-l-xl transition-colors',
                  isCategoryActive
                    ? 'text-text-on-accent/80 hover:text-text-on-accent'
                    : 'text-text-muted hover:text-accent-soft',
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onSelectCategory(node.category)}
                className="flex flex-1 items-center gap-2 py-2 text-left"
              >
                <span
                  className={cn(
                    isCategoryActive ? 'text-text-on-accent/90' : 'text-accent-primary',
                  )}
                >
                  {categoryIcons[node.category]}
                </span>
                <span className="flex-1 truncate">{categoryLabels[node.category]}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                    isCategoryActive
                      ? 'bg-text-on-accent/15 text-text-on-accent'
                      : 'bg-text-on-dark/10 text-text-muted',
                  )}
                >
                  {node.count}
                </span>
              </button>
            </div>

            {isExpanded && node.brands.length > 0 && (
              <ul className="mt-1 ml-3 space-y-0.5 border-l border-border-on-dark pl-3">
                {node.brands.map((brand) => {
                  const isBrandActive =
                    activeCategory === node.category && activeBrand === brand.brand
                  return (
                    <li key={brand.brand}>
                      <button
                        type="button"
                        onClick={() => onSelectBrand(node.category, brand.brand)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                          isBrandActive
                            ? 'bg-accent-mist text-accent-soft ring-1 ring-accent-primary/20'
                            : 'text-text-muted hover:bg-card-inner hover:text-text-on-dark',
                        )}
                      >
                        <span className="flex-1 truncate">{brand.brand}</span>
                        <span
                          className={cn(
                            'tabular-nums text-[11px] font-bold',
                            isBrandActive ? 'text-accent-soft' : 'text-text-faint',
                          )}
                        >
                          {brand.count}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function CategorySidebar({
  products,
  activeCategory,
  activeBrand,
  onSelectAll,
  onSelectCategory,
  onSelectBrand,
  mobileOpen = false,
  onMobileOpenChange,
}: CategorySidebarProps) {
  const tree = useMemo(() => buildTree(products), [products])
  const totalCount = useMemo(() => products.length, [products])

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [hydrated, setHydrated] = useState(false)

  const setMobileOpen = (open: boolean) => {
    onMobileOpenChange?.(open)
  }

  useEffect(() => {
    setExpanded(readExpanded())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    writeExpanded(expanded)
  }, [expanded, hydrated])

  useEffect(() => {
    if (activeCategory !== 'all') {
      setExpanded((prev) => {
        if (prev.has(activeCategory)) return prev
        const next = new Set(prev)
        next.add(activeCategory)
        return next
      })
    }
  }, [activeCategory])

  const toggleExpanded = (category: ProductCategory) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const handleSelectAll = () => {
    onSelectAll()
    setMobileOpen(false)
  }

  const handleSelectCategory = (category: ProductCategory) => {
    onSelectCategory(category)
    smoothScrollTo(`cat-${slugifyForAnchor(category)}`)
    setMobileOpen(false)
  }

  const handleSelectBrand = (category: ProductCategory, brand: string) => {
    onSelectBrand(category, brand)
    smoothScrollTo(`brand-${slugifyForAnchor(category)}-${slugifyForAnchor(brand)}`)
    setMobileOpen(false)
  }

  return (
    <>
      <aside
        className="hidden lg:block lg:sticky lg:top-[5.25rem] lg:max-h-[calc(100vh-6rem)]"
        aria-label="Навигация каталога"
      >
        <div className="surface-card flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="font-display text-[11px] font-bold tracking-[0.22em] text-text-faint">
              КАТАЛОГ
            </h2>
            <span className="rounded-full bg-card-inner px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-muted">
              {totalCount}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-slim px-3 pb-4">
            <SidebarContent
              tree={tree}
              activeCategory={activeCategory}
              activeBrand={activeBrand}
              expanded={expanded}
              onToggleExpanded={toggleExpanded}
              onSelectAll={handleSelectAll}
              onSelectCategory={handleSelectCategory}
              onSelectBrand={handleSelectBrand}
              totalCount={totalCount}
            />
          </div>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[88vw] max-w-[20rem] gap-0 border-r-border-on-dark bg-canvas p-0 sm:w-[20rem]"
        >
          <div className="border-b border-border-on-dark px-4 py-4 pr-12">
            <SheetTitle className="font-display text-sm font-bold tracking-[0.22em] text-text-on-dark">
              КАТАЛОГ
            </SheetTitle>
          </div>
          <div className="overflow-y-auto px-3 py-3">
            <SidebarContent
              tree={tree}
              activeCategory={activeCategory}
              activeBrand={activeBrand}
              expanded={expanded}
              onToggleExpanded={toggleExpanded}
              onSelectAll={handleSelectAll}
              onSelectCategory={handleSelectCategory}
              onSelectBrand={handleSelectBrand}
              totalCount={totalCount}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
