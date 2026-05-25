'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  X,
  SlidersHorizontal,
  Droplet,
  Battery,
  Cpu,
  Leaf,
  Package,
  Layers,
  Candy,
  Citrus,
  Snowflake,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type ProductCategory,
  categoryLabels,
  categoryOrder,
  categorySupportsStrength,
  parseStrengthMg,
} from '@/lib/mock-data'
import { ProductCard } from './ProductCard'
import { useCatalog } from '@/lib/api/hooks/useCatalog'

type CategoryFilter = ProductCategory | 'all'
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

export function ProductGrid() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [tasteFilters, setTasteFilters] = useState<Set<TasteFilter>>(new Set())
  const [strengthFilters, setStrengthFilters] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const { products: allProducts, strengthValues, isLoading } = useCatalog()

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

  const mgOptions = useMemo<number[]>(() => {
    if (strengthValues && strengthValues.length > 0) {
      const fromApi = strengthValues
        .map((v) => parseStrengthMg(v))
        .filter((n): n is number => n != null)
      if (fromApi.length > 0) return Array.from(new Set(fromApi)).sort((a, b) => a - b)
    }
    const fromProducts = allProducts
      .filter((p) => categorySupportsStrength(p.category))
      .map((p) => parseStrengthMg(p.strength))
      .filter((n): n is number => n != null)
    return Array.from(new Set(fromProducts)).sort((a, b) => a - b)
  }, [strengthValues, allProducts])

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      if (category !== 'all' && product.category !== category) return false

      if (search) {
        const searchLower = search.toLowerCase()
        const matchesBrand = product.brand.toLowerCase().includes(searchLower)
        const matchesFlavor = product.flavor.toLowerCase().includes(searchLower)
        if (!matchesBrand && !matchesFlavor) return false
      }

      if (tasteFilters.size > 0) {
        const profile = product.tasteProfile ?? ''
        const hasMatchingTaste = Array.from(tasteFilters).some((taste) => profile.includes(taste))
        if (!hasMatchingTaste) return false
      }

      if (strengthFilters.size > 0) {
        if (!categorySupportsStrength(product.category)) return true
        const mg = parseStrengthMg(product.strength)
        if (mg == null || !strengthFilters.has(mg)) return false
      }

      return true
    })
  }, [allProducts, category, search, tasteFilters, strengthFilters])

  const categoryCount = useMemo(() => {
    const map = new Map<ProductCategory | 'all', number>()
    map.set('all', allProducts.length)
    categoryOrder.forEach((c) => map.set(c, 0))
    for (const p of allProducts) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1)
    }
    return map
  }, [allProducts])

  const activeFilterCount =
    (category !== 'all' ? 1 : 0) + tasteFilters.size + strengthFilters.size
  const showStrengthFilter = mgOptions.length > 0 && (category === 'all' || categorySupportsStrength(category))

  const resetAll = () => {
    setSearch('')
    setCategory('all')
    setTasteFilters(new Set())
    setStrengthFilters(new Set())
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-6">
        <div className="group/search relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted transition-colors group-focus-within/search:text-accent-primary" />
          <input
            type="text"
            placeholder="Бренд, вкус, бренд+мг…"
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

      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <CategoryChip
          label="Все"
          icon={<Layers className="h-3.5 w-3.5" />}
          active={category === 'all'}
          onClick={() => setCategory('all')}
          count={categoryCount.get('all') ?? 0}
        />
        {categoryOrder.map((cat) => (
          <CategoryChip
            key={cat}
            label={categoryLabels[cat]}
            icon={categoryIcons[cat]}
            active={category === cat}
            onClick={() => setCategory(cat)}
            count={categoryCount.get(cat) ?? 0}
          />
        ))}

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'ml-auto flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
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

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          showFilters || activeFilterCount > 0
            ? 'mb-6 max-h-[40rem] opacity-100'
            : 'mb-0 max-h-0 opacity-0',
        )}
      >
        <div className="space-y-4 rounded-2xl border border-border-on-dark bg-elevated p-4">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.2em] text-text-faint">
              <Candy className="h-3 w-3 text-accent-primary" />
              ВКУС
            </h4>
            <div className="flex flex-wrap gap-2">
              {(['sweet', 'sour', 'cold'] as TasteFilter[]).map((taste) => (
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
              ))}
            </div>
          </div>

          {showStrengthFilter && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.2em] text-text-faint">
                <Zap className="h-3 w-3 text-accent-primary" />
                КРЕПОСТЬ (MG)
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
              Найдено: <span className="font-bold text-text-on-dark tabular-nums">{filteredProducts.length}</span>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-3xl shimmer" />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="stagger-fade grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
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
