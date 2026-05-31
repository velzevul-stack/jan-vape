'use client'

import { cn } from '@/lib/utils'
import {
  type Product,
  formatPrice,
  productAvailableStock,
} from '@/lib/mock-data'
import { productHasTaste } from '@/lib/catalog/tasteProfile'
import { useCart } from '@/lib/context/cart-context'
import { CompactStepper } from '@/components/ui-custom/Stepper'
import { Snowflake, Candy, Citrus } from 'lucide-react'

interface BrandRowProps {
  brand: string
  price: number
  products: Product[]
  specification?: string
}

function TasteIcons({ profile }: { profile: string }) {
  return (
    <span className="ml-2 inline-flex gap-0.5 align-middle text-accent-primary">
      {productHasTaste(profile, 'sweet') && <Candy className="h-3 w-3" />}
      {productHasTaste(profile, 'sour') && <Citrus className="h-3 w-3" />}
      {productHasTaste(profile, 'cold') && <Snowflake className="h-3 w-3" />}
    </span>
  )
}

function FlavorRow({ product }: { product: Product }) {
  const { addItem, removeItem, getItemQuantity, updateQuantity } = useCart()
  const quantity = getItemQuantity(product.id)
  const available = productAvailableStock(product)
  const isOut = available === 0
  const isLow = available > 0 && available <= 3

  const handleAdd = () => {
    if (quantity < available) addItem(product, 1)
  }
  const handleRemove = () => {
    if (quantity === 1) removeItem(product.id)
    else updateQuantity(product.id, quantity - 1)
  }

  return (
    <div
      className={cn(
        'flex min-h-[2.75rem] items-center gap-2 px-3 py-1.5 transition-colors',
        isOut && 'opacity-45',
        quantity > 0 && !isOut && 'bg-accent-mist',
      )}
    >
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-sm font-medium leading-snug',
            isOut ? 'text-text-faint line-through' : 'text-text-on-card',
            quantity > 0 && 'font-semibold',
          )}
        >
          {product.flavor}
        </span>
        <TasteIcons profile={product.tasteProfile ?? ''} />
        {isLow && (
          <span className="ml-2 inline-block text-[10px] font-medium text-status-warning">
            {available} шт.
          </span>
        )}
      </div>

      {!isOut && (
        <CompactStepper
          value={quantity}
          onAdd={handleAdd}
          onRemove={handleRemove}
          max={available}
        />
      )}
    </div>
  )
}

export function BrandRow({ brand, price, products, specification }: BrandRowProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-text-on-card/10 bg-card transition-all duration-300 lift-on-hover">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent-primary/0 blur-2xl transition-all duration-500 group-hover:bg-accent-primary/10" />
      <div className="relative flex items-center gap-3 border-b border-text-on-card/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-extrabold uppercase leading-tight tracking-wide text-text-on-card">
            {brand}
          </h3>
          {specification && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              {specification}
            </span>
          )}
        </div>
        <span className="shrink-0 font-display text-lg font-extrabold tabular-nums text-text-on-card">
          {formatPrice(price)}
        </span>
      </div>
      <div className="relative divide-y divide-text-on-card/10">
        {products.map((product) => (
          <FlavorRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
