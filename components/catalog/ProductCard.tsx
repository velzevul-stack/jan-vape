'use client'

import { cn } from '@/lib/utils'
import { type Product, formatPrice, categoryLabels } from '@/lib/mock-data'
import { useCart } from '@/lib/context/cart-context'
import { CompactStepper } from '@/components/ui-custom/Stepper'
import { Snowflake, Candy, Citrus } from 'lucide-react'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, removeItem, getItemQuantity, updateQuantity } = useCart()
  const quantity = getItemQuantity(product.id)
  const availableStock = product.postStock - product.reservedQty

  const handleAdd = () => {
    if (quantity < availableStock) {
      addItem(product, 1)
    }
  }

  const handleRemove = () => {
    if (quantity === 1) {
      removeItem(product.id)
    } else {
      updateQuantity(product.id, quantity - 1)
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl bg-card p-4 transition-all duration-200 hover:shadow-lg">
      {/* Category Badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-medium text-text-on-dark">
          {categoryLabels[product.category]}
        </span>
        <span className="text-xs font-bold tabular-nums text-text-muted">
          {product.strength} mg
        </span>
      </div>

      {/* Product Info */}
      <div className="mb-4 flex-1">
        <h3 className="font-display text-lg font-bold leading-tight tracking-wide text-text-on-card">
          {product.brand}
        </h3>
        <p className="mt-1 text-sm text-text-muted line-clamp-2">{product.flavor}</p>
      </div>

      {/* Taste Profile */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {product.tasteProfile.sweet && (
          <TasteTag icon={<Candy className="h-3 w-3" />} label="Сладкий" />
        )}
        {product.tasteProfile.sour && (
          <TasteTag icon={<Citrus className="h-3 w-3" />} label="Кислый" />
        )}
        {product.tasteProfile.cold && (
          <TasteTag icon={<Snowflake className="h-3 w-3" />} label="Холодный" />
        )}
      </div>

      {/* Price and Add to Cart */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl font-bold tabular-nums text-text-on-card">
            {formatPrice(product.retailPrice)}
          </div>
          {availableStock <= 3 && availableStock > 0 && (
            <span className="text-xs text-status-warning">
              Осталось {availableStock} шт.
            </span>
          )}
          {availableStock === 0 && (
            <span className="text-xs text-status-disabled">Нет в наличии</span>
          )}
        </div>
        
        {availableStock > 0 && (
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
    <div className="flex items-center gap-1 rounded-full bg-card-inner px-2 py-1 text-xs text-text-on-dark">
      {icon}
      <span>{label}</span>
    </div>
  )
}
