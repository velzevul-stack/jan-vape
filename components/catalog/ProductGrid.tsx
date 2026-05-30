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
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Product,
  type ProductCategory,
  categoryLabels,
  categoryOrder,
} from '@/lib/mock-data'
import { ProductCard } from './ProductCard'
import { Slider } from '@/components/ui/slider'
import { mergeFilterRules, slugifyForAnchor } from '@/lib/catalog/filterRules'
import {
  collectStrengthOptions,
  productMatchesStrengthFilter,
} from '@/lib/catalog/productStrength'
import {
  type TasteFilter,
  getAvailableTasteFilters,
  productMatchesTasteFilters,
} from '@/lib/catalog/tasteProfile'
import type { ActiveCategory } from '@/components/layout/CatalogLayout'

const categoryIcons: Record<ProductCategory, React.ReactNode> = {
  liquid: <Droplet className="h-3.5 w-3.5" />,
  disposable: <Battery className="h-3.5 w-3.5" />,
  vape: <Cpu className="h-3.5 w-3.5" />,
  snus: <Leaf className="h-3.5 w-3.5" />,
  consumable: <Package className="h-3.5 w-3.5" />,
}

const tasteMeta: Record<TasteFilter, { icon: React.ReactNode; label: string }> = {
  sweet: { icon: <Candy className="h-4 w-4" />, label: 'Сладкое' },
  sour: { icon: <Citrus className="h-4 w-4" />, label: 'Кислое' },
  cold: { icon: <Snowflake className="h-4 w-4" />, label: 'С холодком' },
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
  onOpenCatalog?: () => void
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
  onOpenCatalog,
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

  const catalogCategories = useMemo(() => {
    const set = new Set<ProductCategory>()
    for (const p of products) set.add(p.category)
    return Array.from(set)
  }, [products])

  const filterRules = useMemo(() => mergeFilterRules(categoriesInBase), [categoriesInBase])

  const catalogFilterRules = useMemo(
    () => mergeFilterRules(catalogCategories),
    [catalogCategories],
  )

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

  const syncedPriceRange = useMemo<[number, number] | null>(() => {
    if (!priceBounds) return null
    if (!priceRange) return priceBounds
    const [pmin, pmax] = priceRange
    if (pmin < priceBounds[0] || pmax > priceBounds[1]) return priceBounds
    return priceRange
  }, [priceBounds, priceRange])

  useEffect(() => {
    if (!priceBounds) {
      setPriceRange(null)
      return
    }
    setPriceRange(priceBounds)
  }, [activeCategory, activeBrand, priceBounds])

  useEffect(() => {
    if (activeCategory === 'all' && activeBrand === null) {
      setTasteFilters(new Set())
      setStrengthFilters(new Set())
      setShowFilters(false)
    }
  }, [activeCategory, activeBrand])

  const strengthProducts = useMemo(
    () => baseFiltered.filter((p) => p.category === 'liquid' || p.category === 'snus'),
    [baseFiltered],
  )

  const mgOptions = useMemo<number[]>(() => {
    if (!filterRules.showStrength) return []
    return collectStrengthOptions(strengthProducts, strengthValues ?? [])
  }, [filterRules.showStrength, strengthProducts, strengthValues])

  const availableTastes = useMemo(
    () => (filterRules.showTaste ? getAvailableTasteFilters(baseFiltered) : []),
    [filterRules.showTaste, baseFiltered],
  )

  const catalogStrengthProducts = useMemo(
    () => products.filter((p) => p.category === 'liquid' || p.category === 'snus'),
    [products],
  )

  const catalogPriceBounds = useMemo<[number, number] | null>(() => {
    if (products.length === 0) return null
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (const p of products) {
      if (p.retailPrice < min) min = p.retailPrice
      if (p.retailPrice > max) max = p.retailPrice
    }
    if (!Number.isFinite(min)) return null
    return [Math.floor(min), Math.ceil(max)]
  }, [products])

  const catalogHasTasteFilters =
    catalogFilterRules.showTaste && getAvailableTasteFilters(products).length > 0

  const catalogHasStrengthFilters =
    catalogFilterRules.showStrength &&
    collectStrengthOptions(catalogStrengthProducts, strengthValues ?? []).length > 0

  const catalogHasPriceFilter =
    catalogPriceBounds != null && catalogPriceBounds[0] !== catalogPriceBounds[1]

  const hasFilterPanelContent =
    catalogHasTasteFilters || catalogHasStrengthFilters || catalogHasPriceFilter

  const priceSectionAvailable =
    priceBounds != null && priceBounds[0] !== priceBounds[1]

  const priceFilterActive =
    priceSectionAvailable &&
    syncedPriceRange != null &&
    (syncedPriceRange[0] !== priceBounds![0] || syncedPriceRange[1] !== priceBounds![1])

  const panelFilterCount =
    (filterRules.showTaste ? tasteFilters.size : 0) +
    (filterRules.showStrength ? strengthFilters.size : 0) +
    (priceSectionAvailable && priceFilterActive ? 1 : 0)

  const resetPanelFilters = () => {
    setTasteFilters(new Set())
    setStrengthFilters(new Set())
    if (priceBounds) setPriceRange(priceBounds)
    setShowFilters(false)
  }

  const handleFilterButtonClick = () => {
    if (showFilters || panelFilterCount > 0) {
      resetPanelFilters()
    } else {
      setShowFilters(true)
    }
  }

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
        if (!productMatchesTasteFilters(product, tasteFilters)) return false
      }

      if (filterRules.showStrength && strengthFilters.size > 0) {
        if (!productMatchesStrengthFilter(product, strengthFilters)) return false
      }

      if (syncedPriceRange) {
        const [pmin, pmax] = syncedPriceRange
        if (product.retailPrice < pmin || product.retailPrice > pmax) return false
      }

      return true
    })
  }, [
    baseFiltered,
    debouncedSearch,
    tasteFilters,
    strengthFilters,
    syncedPriceRange,
    filterRules.showTaste,
    filterRules.showStrength,
  ])

  const groupedProducts = useMemo(
    () => groupProducts(filteredProducts, activeCategory),
    [filteredProducts, activeCategory],
  )

  const handleSelectAllClick = () => {
    setTasteFilters(new Set())
    setStrengthFilters(new Set())
    setShowFilters(false)
    if (catalogPriceBounds) setPriceRange(catalogPriceBounds)
    else setPriceRange(null)
    onSelectAll()
  }

  const resetAll = () => {
    setSearch('')
    handleSelectAllClick()
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

  const visibleCategories = useMemo(
    () => categoryOrder.filter((cat) => products.some((p) => p.category === cat)),
    [products],
  )

  const totalFilteredCount = filteredProducts.length
  const showTasteSection = filterRules.showTaste && availableTastes.length > 0
  const showStrengthSection = filterRules.showStrength && mgOptions.length > 0
  const showPriceSection = priceSectionAvailable && syncedPriceRange != null
  const hasOpenFilterPanelContent = showTasteSection || showStrengthSection || showPriceSection

  useEffect(() => {
    if (showFilters && !hasOpenFilterPanelContent) {
      setShowFilters(false)
    }
  }, [showFilters, hasOpenFilterPanelContent])

  const filtersHighlighted =
    panelFilterCount > 0 || (showFilters && hasOpenFilterPanelContent)

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 flex gap-2">
        {onOpenCatalog && (
          <button
            type="button"
            onClick={onOpenCatalog}
            className="inline-flex h-14 shrink-0 items-center gap-2 rounded-xl border border-border-on-dark bg-elevated px-4 text-sm font-medium text-text-on-dark transition-colors hover:border-accent-primary/40 lg:hidden"
          >
            <Menu className="h-4 w-4 text-accent-primary" />
            <span>Каталог</span>
          </button>
        )}
        <div className="group/search relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted transition-colors group-focus-within/search:text-accent-primary" />
          <input
            type="text"
            placeholder="Бренд, вкус, категория…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-14 w-full rounded-xl border border-border-on-dark bg-elevated pl-12 pr-12 text-base text-text-on-dark transition-colors placeholder:text-text-faint focus:border-accent-primary/60 focus:bg-card-inner focus:outline-none focus:ring-2 focus:ring-accent-mist"
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

      <div className="mb-4 space-y-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAllClick}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              activeCategory === 'all'
                ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/25'
                : 'border-border-on-dark bg-elevated text-text-on-dark hover:border-accent-primary/40',
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">Все товары</span>
            <span
              className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                activeCategory === 'all'
                  ? 'bg-text-on-accent/15 text-text-on-accent'
                  : 'bg-text-on-dark/10 text-text-muted',
              )}
            >
              {products.length}
            </span>
          </button>

          {hasFilterPanelContent && (
            <button
              type="button"
              onClick={handleFilterButtonClick}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                filtersHighlighted
                  ? 'border-accent-primary bg-accent-mist text-accent-soft'
                  : 'border-border-on-dark bg-elevated text-text-on-dark hover:border-accent-primary/40',
              )}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span>Фильтры</span>
              {panelFilterCount > 0 && (
                <span className="rounded-md bg-accent-primary px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-text-on-accent">
                  {panelFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div
          className="grid gap-0.5 rounded-xl border border-border-on-dark bg-card-inner p-0.5"
          style={{ gridTemplateColumns: `repeat(${visibleCategories.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="Категории"
        >
          {visibleCategories.map((cat) => (
            <CategorySegment
              key={cat}
              label={categoryLabels[cat]}
              icon={categoryIcons[cat]}
              active={activeCategory === cat && !activeBrand}
              onClick={() => onSelectCategory(cat)}
            />
          ))}
        </div>
      </div>

      {activeBrand && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-accent-primary/30 bg-accent-mist/60 px-3 py-1.5 text-sm">
          <span className="text-text-muted">Бренд:</span>
          <span className="font-semibold text-accent-soft">{activeBrand}</span>
          <button
            type="button"
            onClick={() => {
              if (activeCategory !== 'all') {
                onSelectCategory(activeCategory)
              } else {
                handleSelectAllClick()
              }
            }}
            className="ml-1 text-text-muted hover:text-text-on-dark"
            aria-label="Сбросить фильтр по бренду"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showFilters && hasOpenFilterPanelContent && (
        <div className="mb-6 rounded-xl border border-border-on-dark bg-elevated p-4">
          {showTasteSection && (
            <FilterSection title="Вкусовой профиль">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {availableTastes.map((taste) => (
                  <FilterToggle
                    key={taste}
                    active={tasteFilters.has(taste)}
                    onClick={() => toggleTaste(taste)}
                    icon={tasteMeta[taste].icon}
                    label={tasteMeta[taste].label}
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {showStrengthSection && (
            <FilterSection
              title={filterRules.strengthLabel}
              className={showTasteSection ? 'mt-4 border-t border-border-on-dark pt-4' : undefined}
            >
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {mgOptions.map((mg) => (
                  <button
                    key={mg}
                    type="button"
                    onClick={() => toggleStrength(mg)}
                    className={cn(
                      'rounded-lg border py-2 text-sm font-semibold tabular-nums transition-colors',
                      strengthFilters.has(mg)
                        ? 'border-accent-primary bg-accent-primary text-text-on-accent'
                        : 'border-border-on-dark bg-card-inner text-text-on-dark hover:border-accent-primary/40',
                    )}
                  >
                    {mg}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}

          {showPriceSection && (
            <FilterSection
              title="Цена, BYN"
              className={
                showTasteSection || showStrengthSection
                  ? 'mt-4 border-t border-border-on-dark pt-4'
                  : undefined
              }
            >
              <div className="mb-2 flex justify-between text-xs tabular-nums text-text-muted">
                <span>{syncedPriceRange![0]}</span>
                <span>{syncedPriceRange![1]}</span>
              </div>
              <Slider
                value={syncedPriceRange!}
                min={priceBounds![0]}
                max={priceBounds![1]}
                step={1}
                onValueChange={(value) => {
                  if (value.length >= 2) {
                    setPriceRange([value[0], value[1]])
                  }
                }}
              />
            </FilterSection>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-text-muted">
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-primary" />
              Загрузка…
            </span>
          ) : (
            <>
              Найдено:{' '}
              <span className="font-bold tabular-nums text-text-on-dark">{totalFilteredCount}</span>
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
                          <span className="rounded-md bg-card-inner px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-muted">
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
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-accent-primary/40 bg-accent-mist px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-primary/20"
          >
            <X className="h-3.5 w-3.5" />
            Сбросить всё
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
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  )
}

function CategorySegment({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-2 transition-colors sm:min-h-[3rem] sm:px-1',
        active
          ? 'bg-elevated text-accent-soft shadow-sm ring-1 ring-accent-primary/30'
          : 'text-text-muted hover:bg-elevated/40 hover:text-text-on-dark',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4',
          active ? 'text-accent-primary' : 'text-accent-primary/70',
        )}
      >
        {icon}
      </span>
      <span className="w-full text-center text-[10px] leading-tight font-medium sm:text-xs">
        {label}
      </span>
    </button>
  )
}

function FilterSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h4>
      {children}
    </div>
  )
}

function FilterToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
        active
          ? 'border-accent-primary bg-accent-mist text-accent-soft'
          : 'border-border-on-dark bg-card-inner text-text-on-dark hover:border-accent-primary/30',
      )}
    >
      <span className={active ? 'text-accent-primary' : 'text-text-muted'}>{icon}</span>
      {label}
    </button>
  )
}
