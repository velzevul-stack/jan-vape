'use client'

import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type CartItem as CartItemType, formatPrice, categoryLabels } from '@/lib/mock-data'
import { useCart } from '@/lib/context/cart-context'
import { Stepper } from '@/components/ui-custom/Stepper'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart()
  const { product, quantity } = item
  const availableStock = product.postStock - product.reservedQty
  const itemTotal = product.retailPrice * quantity

  return (
    <div className="flex gap-4 rounded-2xl bg-card p-4">
      {/* Product Image Placeholder */}
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-card-inner">
        <span className="font-display text-lg font-bold text-text-on-dark">
          {product.brand.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs text-text-muted">{categoryLabels[product.category]}</span>
              <h3 className="font-medium text-text-on-card">{product.brand}</h3>
              <p className="text-sm text-text-muted">{product.flavor}</p>
            </div>
            <button
              onClick={() => removeItem(product.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-status-warning/10 hover:text-status-warning"
              aria-label="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Stepper
            value={quantity}
            onChange={(val) => updateQuantity(product.id, val)}
            min={1}
            max={availableStock}
            size="sm"
          />
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums text-text-on-card">
              {formatPrice(itemTotal)}
            </div>
            {quantity > 1 && (
              <div className="text-xs text-text-muted">
                {formatPrice(product.retailPrice)} / шт.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Empty cart state
export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-elevated py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-card-inner">
        <span className="text-4xl">🛒</span>
      </div>
      <h3 className="font-display text-xl font-bold text-text-on-dark">
        КОРЗИНА ПУСТА
      </h3>
      <p className="mt-2 max-w-xs text-sm text-text-muted">
        Добавьте товары из каталога, чтобы оформить бронирование
      </p>
      <a
        href="/"
        className={cn(
          'mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6',
          'bg-accent-primary font-display text-sm font-bold uppercase tracking-wider text-text-on-accent',
          'transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]'
        )}
      >
        В каталог
      </a>
    </div>
  )
}
