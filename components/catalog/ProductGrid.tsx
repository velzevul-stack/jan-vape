'use client'

import { useState, useMemo } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Product, categoryLabels } from '@/lib/mock-data'
import { FilterChip } from '@/components/ui-custom/FilterChip'
import { ProductCard } from './ProductCard'
import { useCatalog } from '@/lib/api/hooks/useCatalog'

type Category = Product['category'] | 'all'
type TasteFilter = 'sweet' | 'sour' | 'cold'

export function ProductGrid() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [tasteFilters, setTasteFilters] = useState<Set<TasteFilter>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const { products: allProducts, isLoading } = useCatalog()

  const toggleTaste = (taste: TasteFilter) => {
    setTasteFilters(prev => {
      const next = new Set(prev)
      if (next.has(taste)) {
        next.delete(taste)
      } else {
        next.add(taste)
      }
      return next
    })
  }

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      if (category !== 'all' && product.category !== category) return false

      if (search) {
        const searchLower = search.toLowerCase()
        const matchesBrand = product.brand.toLowerCase().includes(searchLower)
        const matchesFlavor = product.flavor.toLowerCase().includes(searchLower)
        if (!matchesBrand && !matchesFlavor) return false
      }

      if (tasteFilters.size > 0) {
        const profile = product.tasteProfile ?? ''
        const hasMatchingTaste = Array.from(tasteFilters).some(taste => profile.includes(taste))
        if (!hasMatchingTaste) return false
      }

      return true
    })
  }, [allProducts, category, search, tasteFilters])

  const categoryCount = useMemo(() => ({
    all: allProducts.length,
    liquid: allProducts.filter(p => p.category === 'liquid').length,
    snus: allProducts.filter(p => p.category === 'snus').length,
    disposable: allProducts.filter(p => p.category === 'disposable').length,
  }), [allProducts])

  return (
    <div className="min-w-0 flex-1">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Поиск по бренду или вкусу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-14 w-full rounded-2xl bg-elevated pl-12 pr-12 text-text-on-dark',
                'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary'
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-on-dark"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <FilterChip
            label="Все"
            active={category === 'all'}
            onClick={() => setCategory('all')}
            count={categoryCount.all}
          />
          {(Object.keys(categoryLabels) as Product['category'][]).map((cat) => (
            <FilterChip
              key={cat}
              label={categoryLabels[cat]}
              active={category === cat}
              onClick={() => setCategory(cat)}
              count={categoryCount[cat]}
            />
          ))}
          
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'ml-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 md:hidden',
              showFilters
                ? 'bg-accent-primary text-text-on-accent'
                : 'bg-elevated text-text-on-dark'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Фильтры</span>
          </button>
        </div>

        {/* Taste Filters */}
        <div
          className={cn(
            'mb-6 flex flex-wrap gap-2 overflow-hidden transition-all duration-200',
            showFilters ? 'max-h-20' : 'max-h-20 md:max-h-20'
          )}
        >
          <span className="flex items-center text-sm text-text-muted">Вкус:</span>
          {(['sweet', 'sour', 'cold'] as TasteFilter[]).map((taste) => (
            <button
              key={taste}
              onClick={() => toggleTaste(taste)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
                tasteFilters.has(taste)
                  ? 'bg-accent-primary text-text-on-accent'
                  : 'bg-card text-text-on-card hover:bg-card/80'
              )}
            >
              {taste === 'sweet' && '🍬 Сладкий'}
              {taste === 'sour' && '🍋 Кислый'}
              {taste === 'cold' && '❄️ Холодный'}
            </button>
          ))}
          {tasteFilters.size > 0 && (
            <button
              onClick={() => setTasteFilters(new Set())}
              className="text-xs text-text-muted hover:text-text-on-dark"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-text-muted">
          {isLoading ? 'Загрузка...' : `Найдено: ${filteredProducts.length} товаров`}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-elevated" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-elevated py-16 text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <h3 className="font-display text-lg font-bold text-text-on-dark">
              Ничего не найдено
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              Попробуйте изменить фильтры или поисковый запрос
            </p>
            <button
              onClick={() => {
                setSearch('')
                setCategory('all')
                setTasteFilters(new Set())
              }}
              className="mt-4 text-sm text-accent-primary hover:underline"
            >
              Сбросить все фильтры
            </button>
          </div>
        )}
    </div>
  )
}
