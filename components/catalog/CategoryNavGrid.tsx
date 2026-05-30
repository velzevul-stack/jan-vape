'use client'

import { Layers, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Product,
  type ProductCategory,
  categoryLabels,
  categoryOrder,
} from '@/lib/mock-data'
import type { ActiveCategory } from '@/components/layout/CatalogLayout'

export interface CategoryNavGridProps {
  products: Product[]
  activeCategory: ActiveCategory
  activeBrand: string | null
  categoryIcons: Record<ProductCategory, React.ReactNode>
  hasFilterPanelContent: boolean
  showFilters: boolean
  panelFilterCount: number
  onSelectAll: () => void
  onSelectCategory: (category: ProductCategory) => void
  onFilterButtonClick: () => void
}

export function CategoryNavGrid({
  products,
  activeCategory,
  activeBrand,
  categoryIcons,
  hasFilterPanelContent,
  showFilters,
  panelFilterCount,
  onSelectAll,
  onSelectCategory,
  onFilterButtonClick,
}: CategoryNavGridProps) {
  return (
    <div className="mb-4 space-y-2">
      <button
        type="button"
        onClick={onSelectAll}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
          activeCategory === 'all'
            ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/25'
            : 'border-border-on-dark bg-elevated text-text-on-dark hover:border-accent-primary/40',
        )}
      >
        <Layers className="h-4 w-4" />
        <span>Все товары</span>
        <span
          className={cn(
            'rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
            activeCategory === 'all'
              ? 'bg-text-on-accent/15 text-text-on-accent'
              : 'bg-text-on-dark/10 text-text-muted',
          )}
        >
          {products.length}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categoryOrder.map((cat) => {
          const count = products.filter((p) => p.category === cat).length
          if (count === 0) return null
          return (
            <CategoryPlate
              key={cat}
              label={categoryLabels[cat]}
              icon={categoryIcons[cat]}
              active={activeCategory === cat && !activeBrand}
              onClick={() => onSelectCategory(cat)}
            />
          )
        })}

        {hasFilterPanelContent && (
          <button
            type="button"
            onClick={onFilterButtonClick}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
              showFilters || panelFilterCount > 0
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
    </div>
  )
}

function CategoryPlate({
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
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-accent-primary bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/25'
          : 'border-border-on-dark bg-elevated text-text-on-dark hover:border-accent-primary/40',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-text-on-accent/90' : 'text-accent-primary')}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}
