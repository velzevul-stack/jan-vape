'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/context/cart-context'
import { formatPrice } from '@/lib/mock-data'

export function StickyCartBar() {
  const { totalItems, totalPrice } = useCart()

  if (totalItems === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-on-dark bg-canvas/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="h-6 w-6 text-text-on-dark" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-text-on-accent">
              {totalItems}
            </span>
          </div>
          <div>
            <div className="text-sm text-text-muted">Итого</div>
            <div className="font-bold tabular-nums text-text-on-dark">
              {formatPrice(totalPrice)}
            </div>
          </div>
        </div>
        <Link
          href="/cart"
          className="flex h-12 items-center gap-2 rounded-full bg-accent-primary px-6 font-display text-sm font-bold uppercase tracking-wider text-text-on-accent transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          В корзину
        </Link>
      </div>
    </div>
  )
}

// Desktop version - sidebar style
export function CartSidebar() {
  const { totalItems, totalPrice, items } = useCart()

  if (totalItems === 0) return null

  return (
    <div className="hidden lg:block">
      <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-wider text-text-on-card">
            КОРЗИНА
          </h3>
          <span className="rounded-full bg-accent-primary px-2.5 py-1 text-xs font-bold text-text-on-accent">
            {totalItems}
          </span>
        </div>

        <div className="mb-4 space-y-3">
          {items.slice(0, 3).map((item) => (
            <div key={item.product.id} className="flex items-center justify-between text-sm">
              <span className="truncate text-text-on-card">
                {item.product.brand} {item.product.flavor}
              </span>
              <span className="ml-2 font-medium text-text-muted">x{item.quantity}</span>
            </div>
          ))}
          {items.length > 3 && (
            <div className="text-sm text-text-muted">
              и ещё {items.length - 3} поз.
            </div>
          )}
        </div>

        <div className="mb-4 border-t border-border-subtle pt-4">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Итого</span>
            <span className="text-xl font-bold tabular-nums text-text-on-card">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>

        <Link
          href="/cart"
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-full',
            'bg-accent-primary font-display text-sm font-bold uppercase tracking-wider text-text-on-accent',
            'transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]'
          )}
        >
          Перейти в корзину
        </Link>
      </div>
    </div>
  )
}
