'use client'

import { cn } from '@/lib/utils'
import {
  type Product,
  formatPrice,
  categoryLabels,
  productAvailableStock,
  categorySupportsStrength,
} from '@/lib/mock-data'
import { getPrimaryProductStrengthMg } from '@/lib/catalog/productStrength'
import {
  type TasteFilter,
  productHasTaste,
  categorySupportsTasteFilter,
} from '@/lib/catalog/tasteProfile'
import { useCart } from '@/lib/context/cart-context'
import { CompactStepper } from '@/components/ui-custom/Stepper'
import {
  Snowflake,
  Candy,
  Citrus,
  Droplet,
  Battery,
  Cpu,
  Leaf,
  Package,
  Zap,
} from 'lucide-react'

interface ProductCardProps {
  product: Product
}

const categoryIcons: Record<Product['category'], React.ReactNode> = {
  liquid: <Droplet className="h-3 w-3" />,
  disposable: <Battery className="h-3 w-3" />,
  vape: <Cpu className="h-3 w-3" />,
  snus: <Leaf className="h-3 w-3" />,
  consumable: <Package className="h-3 w-3" />,
}

const tasteTags: { key: TasteFilter; icon: React.ReactNode; label: string }[] = [
  { key: 'sweet', icon: <Candy className="h-3 w-3" />, label: 'Сладкий' },
  { key: 'sour', icon: <Citrus className="h-3 w-3" />, label: 'Кислый' },
  { key: 'cold', icon: <Snowflake className="h-3 w-3" />, label: 'Холодный' },
]

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, removeItem, getItemQuantity, updateQuantity } = useCart()
  const quantity = getItemQuantity(product.id)
  const availableStock = productAvailableStock(product)
  const profile = product.tasteProfile ?? ''
  const showStrength = categorySupportsStrength(product.category)
  const mg = showStrength ? getPrimaryProductStrengthMg(product) : null
  const showTasteTags = categorySupportsTasteFilter(product.category)
  const isOut = availableStock === 0
  const isLow = availableStock > 0 && availableStock <= 3
  const visibleTasteTags = showTasteTags
    ? tasteTags.filter(({ key }) => productHasTaste(profile, key))
    : []

  const handleAdd = () => {
    if (quantity < availableStock) addItem(product, 1)
  }

  const handleRemove = () => {
    if (quantity === 1) removeItem(product.id)
    else updateQuantity(product.id, quantity - 1)
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-text-on-card/10 bg-card p-4 transition-all duration-300',
        'lift-on-hover',
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent-primary/0 blur-2xl transition-all duration-500 group-hover:bg-accent-primary/10" />

      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card-inner px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-text-on-dark">
          <span className="text-accent-primary">{categoryIcons[product.category]}</span>
          {categoryLabels[product.category]}
        </span>
        {showStrength && mg != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-mist px-2 py-0.5 text-xs font-bold tabular-nums text-accent-soft">
            <Zap className="h-3 w-3" />
            {mg} mg
          </span>
        )}
        {!showStrength && product.specification && (
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {product.specification}
          </span>
        )}
      </div>

      <div className="relative mb-4 flex-1">
        <h3 className="font-display text-lg font-extrabold leading-tight tracking-wide text-text-on-card">
          {product.brand}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">{product.flavor}</p>
      </div>

      {visibleTasteTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {visibleTasteTags.map(({ key, icon, label }) => (
            <TasteTag key={key} icon={icon} label={label} />
          ))}
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 border-t border-text-on-card/10 pt-3">
        <div className="min-w-0">
          <div className="font-display text-2xl font-extrabold tabular-nums text-text-on-card">
            {formatPrice(product.retailPrice)}
          </div>
          {isLow && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-status-warning">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-warning" />
              Осталось {availableStock} шт.
            </span>
          )}
          {isOut && (
            <span className="mt-0.5 inline-block text-xs font-medium text-text-faint">
              Нет в наличии
            </span>
          )}
        </div>

        {!isOut && (
          <CompactStepper
            value={quantity}
            onAdd={handleAdd}
            onRemove={handleRemove}
            max={availableStock}
          />
        )}
      </div>
    </div>
  )
}

function TasteTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-card-inner px-2 py-1 text-[11px] text-text-on-dark">
      <span className="text-accent-primary">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
