'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  X,
  SlidersHorizontal,
  Droplet,
  Battery,
  Cpu,
  Leaf,
  Package,
  Candy,
  Citrus,
  Snowflake,
  Zap,
  ArrowUp,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Product,
  type ProductCategory,
  categoryLabels,
  categoryOrder,
  parseStrengthMg,
} from '@/lib/mock-data'
import { ProductCard } from './ProductCard'
import { Slider } from '@/components/ui/slider'
import { mergeFilterRules, slugifyForAnchor } from '@/lib/catalog/filterRules'
import type { ActiveCategory } from '@/components/layout/CatalogLayout'

type TasteFilter = 'sweet' | 'sour' | 'cold'

const categoryIcons: Record<ProductCategory, React.ReactNode> = {
  liquid: <Droplet className="h-3.5 w-3.5" />,
  disposable: <Battery className="h-3.5 w-3.5" />,
  vape: <Cpu className="h-3.5 w-3.5" />,
  snus: <Leaf className="h-3.5 w-3.5" />,
  consumable: <Package className="h-3.5 w-3.5" />,
}

const tasteMeta: Record<TasteFilter, { icon: React.ReactNode; label: string }> = {
  sweet: { icon: <Candy className="h-3.5 w-3.5" />, label: 'Сладкий' },
  sour: { icon: <Citrus className="h-3.5 w-3.5" />, label: 'Кислый' },
  cold: { icon: <Snowflake className="h-3.5 w-3.5" />, label: 'Холодный' },
}

export interface ProductGridProps {
  products: Product[]
  isLoading: boolean
  strengthValues: string[]
  activeCategory: ActiveCategory
  activeBrand: string | null
  onSelectAll: () => void
  onSelectCategory: (category: ProductCategory) => void
  onSelectBrand: (category: ProductCategory, brand: string) => void
}

interface BrandGroup {
  brand: string
  category: ProductCategory
  products: Product[]
}

interface CategoryGroup {
  category: ProductCategory
  brands: BrandGroup[]
  count: number
}

function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function groupProducts(
  products: Product[],
  activeCategory: ActiveCategory,
): CategoryGroup[] {
  const byCategory = new Map<ProductCategory, Map<string, Product[]>>()
  for (const p of products) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, new Map())
    const brands = byCategory.get(p.category)!
    if (!brands.has(p.brand)) brands.set(p.brand, [])
    brands.get(p.brand)!.push(p)
  }

  const result: CategoryGroup[] = []
  for (const category of categoryOrder) {
    if (activeCategory !== 'all' && activeCategory !== category) continue
    const brands = byCategory.get(category)
    if (!brands || brands.size === 0) continue
    const brandList: BrandGroup[] = Array.from(brands.entries())
      .map(([brand, items]) => ({ brand, category, products: items }))
      .sort((a, b) => {
        if (b.products.length !== a.products.length) {
          return b.products.length - a.products.length
        }
        return a.brand.localeCompare(b.brand)
      })
    const count = brandList.reduce((sum, b) => sum + b.products.length, 0)
    result.push({ category, brands: brandList, count })
  }
  return result
}

export function ProductGrid({
  products,
  isLoading,
  strengthValues,
  activeCategory,
  activeBrand,
  onSelectAll,
  onSelectCategory,
  onSelectBrand,
}: ProductGridProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 200)

  const [tasteFilters, setTasteFilters] = useState<Set<TasteFilter>>(new Set())
  const [strengthFilters, setStrengthFilters] = useState<Set<number>>(new Set())
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)

  const toggleTaste = (taste: TasteFilter) => {
    setTasteFilters((prev) => {
      const next = new Set(prev)
      if (next.has(taste)) next.delete(taste)
      else next.add(taste)
      return next
    })
  }

  const toggleStrength = (mg: number) => {
    setStrengthFilters((prev) => {
      const next = new Set(prev)
      if (next.has(mg)) next.delete(mg)
      else next.add(mg)
      return next
    })
  }

  const baseFiltered = useMemo(() => {
    return products.filter((product) => {
      if (activeCategory !== 'all' && product.category !== activeCategory) return false
      if (activeBrand && product.brand !== activeBrand) return false
      return true
    })
  }, [products, activeCategory, activeBrand])

  const categoriesInBase = useMemo(() => {
    const set = new Set<ProductCategory>()
    for (const p of baseFiltered) set.add(p.category)
    return Array.from(set)
  }, [baseFiltered])

  const filterRules = useMemo(() => mergeFilterRules(categoriesInBase), [categoriesInBase])

  const priceBounds = useMemo<[number, number] | null>(() => {
    if (baseFiltered.length === 0) return null
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (const p of baseFiltered) {
      if (p.retailPrice < min) min = p.retailPrice
      if (p.retailPrice > max) max = p.retailPrice
    }
    if (!Number.isFinite(min)) return null
    return [Math.floor(min), Math.ceil(max)]
  }, [baseFiltered])

  useEffect(() => {
    if (!priceBounds) {
      if (priceRange !== null) setPriceRange(null)
      return
    }
    setPriceRange((prev) => {
      if (!prev) return priceBounds
      const [pmin, pmax] = prev
      if (pmin < priceBounds[0] || pmax > priceBounds[1]) return priceBounds
      return prev
    })
  }, [priceBounds, priceRange])

  const mgOptions = useMemo<number[]>(() => {
    if (!filterRules.showStrength) return []
    const fromBase = baseFiltered
      .map((p) => parseStrengthMg(p.strength))
      .filter((n): n is number => n != null)
    const fromApi = (strengthValues ?? [])
      .map((v) => parseStrengthMg(v))
      .filter((n): n is number => n != null)
    const combined = new Set<number>([...fromBase, ...fromApi])
    return Array.from(combined).sort((a, b) => a - b)
  }, [filterRules.showStrength, baseFiltered, strengthValues])

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return baseFiltered.filter((product) => {
      if (q) {
        const matchesBrand = product.brand.toLowerCase().includes(q)
        const matchesFlavor = product.flavor.toLowerCase().includes(q)
        const matchesCategory = categoryLabels[product.category]?.toLowerCase().includes(q)
        if (!matchesBrand && !matchesFlavor && !matchesCategory) return false
      }

      if (filterRules.showTaste && tasteFilters.size > 0) {
        const profile = product.tasteProfile ?? ''
        const hasMatchingTaste = Array.from(tasteFilters).some((taste) => profile.includes(taste))
        if (!hasMatchingTaste) return false
      }

      if (filterRules.showStrength && strengthFilters.size > 0) {
        const mg = parseStrengthMg(product.strength)
        if (mg == null || !strengthFilters.has(mg)) return false
      }

      if (priceRange) {
        const [pmin, pmax] = priceRange
        if (product.retailPrice < pmin || product.retailPrice > pmax) return false
      }

      return true
    })
  }, [
    baseFiltered,
    debouncedSearch,
    tasteFilters,
    strengthFilters,
    priceRange,
    filterRules.showTaste,
    filterRules.showStrength,
  ])

  const groupedProducts = useMemo(
    () => groupProducts(filteredProducts, activeCategory),
    [filteredProducts, activeCategory],
  )

  const activeFilterCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (activeBrand ? 1 : 0) +
    tasteFilters.size +
    strengthFilters.size +
    (priceRange && priceBounds &&
      (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1])
      ? 1
      : 0)

  const resetAll = () => {
    setSearch('')
    onSelectAll()
    setTasteFilters(new Set())
    setStrengthFilters(new Set())
    setPriceRange(priceBounds)
  }

  const observerRef = useRef<IntersectionObserver | null>(null)
  const sectionsRef = useRef<Map<string, Element>>(new Map())

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 800)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveAnchor(visible.target.id)
      },
      {
        rootMargin: '-30% 0px -55% 0px',
        threshold: [0, 0.25, 0.5],
      },
    )
    observerRef.current = observer
    sectionsRef.current.forEach((el) => observer.observe(el))
    return () => {
      observer.disconnect()
    }
  }, [groupedProducts])

  const registerSection = (key: string, el: Element | null) => {
    if (!el) {
      sectionsRef.current.delete(key)
      return
    }
    sectionsRef.current.set(key, el)
    if (observerRef.current) observerRef.current.observe(el)
  }

  const scrollToTop = () => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalFilteredCount = filteredProducts.length

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-6">
        <div className="group/search relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted transition-colors group-focus-within/search:text-accent-primary" />
          <input
            type="text"
            placeholder="Бренд, вкус, категория…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-14 w-full rounded-2xl border border-border-on-dark bg-elevated pl-12 pr-12 text-base text-text-on-dark transition-colors placeholder:text-text-faint focus:border-accent-primary/60 focus:bg-card-inner focus:outline-none focus:ring-2 focus:ring-accent-mist"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-on-dark"
              aria-label="Очистить поиск"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CategoryChip
          label="Все"
          icon={<Layers className="h-3.5 w-3.5" />}
          active={activeCategory === 'all'}
          onClick={onSelectAll}
          count={products.length}
        />
        {categoryOrder.map((cat) => {
          const count = products.filter((p) => p.category === cat).length
          if (count === 0) return null
          return (
            <CategoryChip
              key={cat}
              label={categoryLabels[cat]}
              icon={categoryIcons[cat]}
              active={activeCategory === cat && !activeBrand}
              onClick={() => onSelectCategory(cat)}
              count={count}
            />
          )
        })}

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'ml-auto inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
            showFilters || activeFilterCount > 0
              ? 'border-accent-primary/50 bg-accent-mist text-accent-soft'
              : 'border-border-on-dark bg-elevated text-text-on-dark hover:border-accent-primary/40',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Фильтры</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-accent-primary px-1.5 py-0.5 text-[11px] font-bold text-text-on-accent">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {activeBrand && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-mist px-3 py-1.5 text-sm">
          <span className="text-text-muted">Бренд:</span>
          <span className="font-semibold text-accent-soft">{activeBrand}</span>
          <button
            type="button"
            onClick={() => {
              if (activeCategory !== 'all') {
                onSelectCategory(activeCategory)
              } else {
                onSelectAll()
              }
            }}
            className="ml-1 text-text-muted hover:text-text-on-dark"
            aria-label="Сбросить фильтр по бренду"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          showFilters || activeFilterCount > 0
            ? 'mb-6 max-h-[60rem] opacity-100'
            : 'mb-0 max-h-0 opacity-0',
        )}
      >
        <div className="space-y-5 rounded-2xl border border-border-on-dark bg-elevated p-4">
          {filterRules.showTaste && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.2em] text-text-faint">
                <Candy className="h-3 w-3 text-accent-primary" />
                ВКУС
              </h4>
              <div className="flex flex-wrap gap-2">
                {(['sweet', 'sour', 'cold'] as TasteFilter[]).map((taste) => {
                  const hasAny = baseFiltered.some((p) =>
                    (p.tasteProfile ?? '').includes(taste),
                  )
                  if (!hasAny) return null
                  return (
                    <button
                      key={taste}
                      onClick={() => toggleTaste(taste)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                        tasteFilters.has(taste)
                          ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/30'
                          : 'border-border-strong bg-card-inner text-text-on-dark hover:border-accent-primary/40',
                      )}
                    >
                      {tasteMeta[taste].icon}
                      <span>{tasteMeta[taste].label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {filterRules.showStrength && mgOptions.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.2em] text-text-faint">
                <Zap className="h-3 w-3 text-accent-primary" />
                {filterRules.strengthLabel.toUpperCase()}
              </h4>
              <div className="flex flex-wrap gap-2">
                {mgOptions.map((mg) => (
                  <button
                    key={mg}
                    onClick={() => toggleStrength(mg)}
                    className={cn(
                      'inline-flex h-9 min-w-[3.5rem] items-center justify-center rounded-full border px-3 text-sm font-bold tabular-nums transition-all duration-200',
                      strengthFilters.has(mg)
                        ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/30'
                        : 'border-border-strong bg-card-inner text-text-on-dark hover:border-accent-primary/40',
                    )}
                  >
                    {mg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {priceBounds && priceRange && priceBounds[0] !== priceBounds[1] && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.2em] text-text-faint">
                  ЦЕНА
                </h4>
                <div className="text-xs tabular-nums text-text-muted">
                  <span className="text-text-on-dark">{priceRange[0]}</span>
                  {' — '}
                  <span className="text-text-on-dark">{priceRange[1]}</span>
                </div>
              </div>
              <Slider
                value={priceRange}
                min={priceBounds[0]}
                max={priceBounds[1]}
                step={1}
                onValueChange={(value) => {
                  if (value.length >= 2) {
                    setPriceRange([value[0], value[1]])
                  }
                }}
              />
            </div>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted underline-offset-2 hover:text-accent-primary hover:underline"
            >
              <X className="h-3 w-3" />
              Сбросить все фильтры
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-text-muted">
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-primary" />
              Загрузка…
            </span>
          ) : (
            <>
              Найдено: <span className="font-bold text-text-on-dark tabular-nums">{totalFilteredCount}</span>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-3xl shimmer" />
          ))}
        </div>
      ) : groupedProducts.length > 0 ? (
        <div className="space-y-10">
          {groupedProducts.map((group) => {
            const catAnchor = `cat-${slugifyForAnchor(group.category)}`
            const showCategoryHeader = activeCategory === 'all'
            return (
              <section
                key={group.category}
                id={catAnchor}
                ref={(el) => registerSection(catAnchor, el)}
                className={cn(
                  'scroll-mt-24 rounded-3xl transition-shadow',
                  activeAnchor === catAnchor && 'shadow-[0_0_0_1px_rgba(201,162,78,0.18)]',
                )}
              >
                {showCategoryHeader && (
                  <header className="mb-5 flex items-end justify-between gap-2 border-b border-border-on-dark pb-2">
                    <h2 className="font-display text-2xl font-extrabold tracking-wider text-text-on-dark sm:text-3xl">
                      <span className="mr-2 inline-flex items-center text-accent-primary">
                        {categoryIcons[group.category]}
                      </span>
                      {categoryLabels[group.category]}
                    </h2>
                    <span className="text-sm text-text-muted">
                      <span className="font-bold tabular-nums text-text-on-dark">{group.count}</span>{' '}
                      товаров
                    </span>
                  </header>
                )}

                <div className="space-y-8">
                  {group.brands.map((brandGroup) => {
                    const brandAnchor = `brand-${slugifyForAnchor(group.category)}-${slugifyForAnchor(brandGroup.brand)}`
                    return (
                      <section
                        key={brandAnchor}
                        id={brandAnchor}
                        ref={(el) => registerSection(brandAnchor, el)}
                        className="scroll-mt-24"
                      >
                        <header className="mb-3 flex items-center justify-between gap-3">
                          <h3
                            className={cn(
                              'font-display text-base font-extrabold tracking-wide text-text-on-dark sm:text-lg',
                              activeAnchor === brandAnchor && 'text-accent-soft',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectBrand(group.category, brandGroup.brand)}
                              className="text-left transition-colors hover:text-accent-soft"
                            >
                              {brandGroup.brand}
                            </button>
                          </h3>
                          <span className="rounded-full bg-card-inner px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-text-muted">
                            {brandGroup.products.length}
                          </span>
                        </header>

                        <div className="stagger-fade grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                          {brandGroup.products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="surface-card flex flex-col items-center justify-center rounded-3xl py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card-inner">
            <Search className="h-6 w-6 text-text-muted" />
          </div>
          <h3 className="font-display text-lg font-bold tracking-wider text-text-on-dark">
            НИЧЕГО НЕ НАЙДЕНО
          </h3>
          <p className="mt-2 text-sm text-text-muted">
            Попробуйте изменить фильтры или поисковый запрос
          </p>
          <button
            onClick={resetAll}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent-primary/40 bg-accent-mist px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-primary/20"
          >
            <X className="h-3.5 w-3.5" />
            Сбросить все фильтры
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Наверх"
        className={cn(
          'fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-accent-primary/40 bg-canvas/90 text-accent-soft shadow-lg shadow-black/30 backdrop-blur-md transition-all duration-200 md:bottom-8 md:right-8',
          showBackToTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none',
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  )
}

function CategoryChip({
  label,
  icon,
  active,
  onClick,
  count,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap',
        active
          ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30'
          : 'border-border-on-dark bg-elevated text-text-on-dark hover:-translate-y-px hover:border-accent-primary/40 hover:bg-card-inner',
      )}
    >
      <span className={cn('text-current', active ? 'opacity-90' : 'text-accent-primary')}>
        {icon}
      </span>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
            active
              ? 'bg-text-on-accent/15 text-text-on-accent'
              : 'bg-text-on-dark/10 text-text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
