'use client'

import Link from 'next/link'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type CartItem as CartItemType,
  formatPrice,
  categoryLabels,
  productAvailableStock,
} from '@/lib/mock-data'
import { useCart } from '@/lib/context/cart-context'
import { Stepper } from '@/components/ui-custom/Stepper'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart()
  const { product, quantity } = item
  const availableStock = productAvailableStock(product)
  const itemTotal = product.retailPrice * quantity

  return (
    <div className="surface-card group/cart relative flex gap-4 rounded-2xl p-4 transition-all duration-200 hover:border-accent-primary/30">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent-mist via-card-inner to-card-deep">
        <span className="font-display text-xl font-extrabold tracking-wider text-accent-soft">
          {product.brand.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-card-inner px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              {categoryLabels[product.category]}
            </span>
            <h3 className="mt-1 truncate font-display text-base font-extrabold text-text-on-dark">
              {product.brand}
            </h3>
            {product.flavor?.trim() && (
              <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{product.flavor.trim()}</p>
            )}
          </div>
          <button
            onClick={() => removeItem(product.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-faint transition-colors hover:bg-status-danger/10 hover:text-status-danger"
            aria-label="Удалить из корзины"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Stepper
            value={quantity}
            onChange={(val) => updateQuantity(product.id, val)}
            min={1}
            max={availableStock}
            size="sm"
          />
          <div className="text-right">
            <div className="font-display text-lg font-extrabold tabular-nums text-text-on-dark">
              {formatPrice(itemTotal)}
            </div>
            {quantity > 1 && (
              <div className="text-[11px] text-text-faint tabular-nums">
                {formatPrice(product.retailPrice)} / шт.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EmptyCart() {
  return (
    <div className="surface-card relative flex flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-16 text-center">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent-mint/8 blur-3xl" />

      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-border-on-dark bg-card-inner">
        <ShoppingBag className="h-8 w-8 text-accent-primary" />
      </div>
      <h3 className="font-display text-2xl font-extrabold tracking-wider text-text-on-dark">
        КОРЗИНА ПУСТА
      </h3>
      <p className="mt-2 max-w-xs text-sm text-text-muted">
        Откройте каталог и выберите подходящие позиции — оформление займёт пару минут.
      </p>
      <Link
        href="/"
        className={cn(
          'mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent-primary px-6',
          'font-display text-sm font-extrabold uppercase tracking-wider text-text-on-accent',
          'shadow-lg shadow-accent-primary/30 transition-all duration-200 hover:shadow-accent-primary/50 active:scale-[0.98]',
        )}
      >
        В каталог
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
