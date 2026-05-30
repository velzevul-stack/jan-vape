'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Drawer } from 'vaul'
import { ShoppingBag, Trash2, ChevronUp, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/context/cart-context'
import { formatPrice } from '@/lib/mock-data'
import { Stepper } from '@/components/ui-custom/Stepper'
import { CartProductLines } from '@/components/cart/CartProductLines'

export function StickyCartBar() {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart()
  const [open, setOpen] = useState(false)

  if (totalItems === 0) return null

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} shouldScaleBackground>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-on-dark bg-canvas/90 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 pb-[env(safe-area-inset-bottom)]">
          <Drawer.Trigger className="flex flex-1 items-center gap-3 text-left">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-canvas bg-accent-ember px-1 text-[10px] font-bold tabular-nums text-text-on-accent">
                {totalItems}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-muted">
                Корзина <ChevronUp className="h-3 w-3" />
              </div>
              <div className="truncate font-display text-base font-extrabold tabular-nums text-text-on-dark">
                {formatPrice(totalPrice)}
              </div>
            </div>
          </Drawer.Trigger>

          <Link
            href="/cart"
            className="flex h-11 items-center gap-2 rounded-full bg-accent-primary px-5 font-display text-sm font-extrabold uppercase tracking-wider text-text-on-accent shadow-lg shadow-accent-primary/30 transition-all duration-200 active:scale-95"
          >
            Оформить
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[61] flex max-h-[88vh] flex-col rounded-t-3xl border-t border-border-on-dark bg-elevated text-text-on-dark outline-none">
          <Drawer.Title className="sr-only">Корзина</Drawer.Title>
          <Drawer.Description className="sr-only">
            Просмотр и редактирование товаров в корзине.
          </Drawer.Description>
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-text-faint/40" />
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-wider text-text-on-dark">
                КОРЗИНА
              </h2>
              <p className="text-xs text-text-muted">
                {totalItems} {totalItemsWord(totalItems)} · {formatPrice(totalPrice)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  clearCart()
                  setOpen(false)
                }}
                className="flex h-9 items-center gap-1.5 rounded-full border border-border-on-dark bg-card-inner px-3 text-xs text-text-muted transition-colors hover:border-status-danger/40 hover:text-status-danger"
                aria-label="Очистить корзину"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Очистить</span>
              </button>
              <Drawer.Close
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-on-dark bg-card-inner text-text-muted hover:text-text-on-dark"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </Drawer.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 scrollbar-slim">
            <div className="space-y-3 pb-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="surface-card flex items-center gap-3 rounded-2xl p-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-mist text-accent-soft">
                    <span className="font-display text-base font-extrabold">
                      {item.product.brand.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <CartProductLines
                      product={item.product}
                      brandClassName="text-sm font-semibold"
                      flavorClassName="text-xs"
                    />
                    <div className="mt-1 font-display text-sm font-bold tabular-nums text-accent-soft">
                      {formatPrice(item.product.retailPrice * item.quantity)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Stepper
                      value={item.quantity}
                      onChange={(val) => updateQuantity(item.product.id, val)}
                      min={1}
                      max={item.product.availableOnPost}
                      size="sm"
                    />
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-[11px] text-text-faint transition-colors hover:text-status-danger"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border-on-dark bg-canvas/40 px-5 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-bold tracking-wider text-text-muted">
                ИТОГО
              </span>
              <span className="font-display text-2xl font-extrabold tabular-nums text-text-on-dark">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-primary font-display text-sm font-extrabold uppercase tracking-wider text-text-on-accent shadow-lg shadow-accent-primary/30 transition-all duration-200 active:scale-[0.98]"
            >
              К оформлению
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function totalItemsWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'товара'
  return 'товаров'
}

export function CartSidebar() {
  const { totalItems, totalPrice, items } = useCart()

  if (totalItems === 0) return null

  return (
    <div className="hidden lg:block">
      <div className="surface-card max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl p-5 scrollbar-slim">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold tracking-wider text-text-on-dark">
            КОРЗИНА
          </h3>
          <span
            className={cn(
              'rounded-full bg-accent-primary px-2.5 py-1 text-xs font-bold tabular-nums text-text-on-accent',
            )}
          >
            {totalItems}
          </span>
        </div>

        <div className="mb-4 space-y-2">
          {items.slice(0, 4).map((item) => (
            <div
              key={item.product.id}
              className="flex items-start justify-between gap-2 text-sm"
            >
              <CartProductLines
                product={item.product}
                brandClassName="text-sm font-medium"
                flavorClassName="text-[11px]"
              />
              <span className="ml-2 shrink-0 text-text-muted tabular-nums">
                ×{item.quantity}
              </span>
            </div>
          ))}
          {items.length > 4 && (
            <div className="text-xs text-text-faint">
              и ещё {items.length - 4} поз.
            </div>
          )}
        </div>

        <div className="mb-4 border-t border-border-on-dark pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Итого</span>
            <span className="font-display text-xl font-extrabold tabular-nums text-text-on-dark">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>

        <Link
          href="/cart"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-primary font-display text-sm font-extrabold uppercase tracking-wider text-text-on-accent shadow-lg shadow-accent-primary/30 transition-all duration-200 hover:shadow-accent-primary/50 active:scale-[0.98]"
        >
          Перейти в корзину
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
