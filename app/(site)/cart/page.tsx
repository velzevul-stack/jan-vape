'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import { useCart } from '@/lib/context/cart-context'
import { useBooking } from '@/lib/context/booking-context'
import { useCatalog } from '@/lib/api/hooks/useCatalog'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartItem, EmptyCart } from '@/components/cart/CartItem'
import { PickupLocationSelector } from '@/components/checkout/PickupLocationSelector'
import { DeliveryConfirmDialog } from '@/components/checkout/DeliveryConfirmDialog'
import { PageContainer } from '@/components/layout/PageContainer'

export default function CartPage() {
  const router = useRouter()
  const { items, totalItems, totalPrice, clearCart, syncWithCatalog, cartLimitMessage } = useCart()
  const { canProceedToCheckout, isPickupSelected, isDeliverySelected, isDeliveryDraft } = useBooking()
  const { products } = useCatalog({}, { refreshInterval: 5_000 })
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false)
  const [selectorCollapse, setSelectorCollapse] = useState(0)

  useEffect(() => {
    if (products.length > 0) {
      syncWithCatalog(products)
    }
  }, [products, syncWithCatalog])

  const handleProceed = () => {
    if (!canProceedToCheckout) return
    setSelectorCollapse((value) => value + 1)
    if (isPickupSelected || isDeliverySelected) {
      router.push('/checkout')
      return
    }
    if (isDeliveryDraft) {
      setDeliveryConfirmOpen(true)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col overflow-x-hidden">
        <Header />
        <main className="box-border flex w-full min-w-0 max-w-full flex-1 items-center justify-center overflow-x-clip py-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <EmptyCart />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Header />

      <main className="box-border w-full min-w-0 max-w-full flex-1 overflow-x-clip py-6 pb-28 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-6 md:py-10 lg:pb-10">
        <PageContainer maxWidth="cart" className="max-w-full">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-accent-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад в каталог</span>
          </Link>

          {cartLimitMessage && (
            <div className="mb-4 rounded-2xl border border-accent-warning/40 bg-accent-warning/10 px-4 py-3 text-sm text-accent-warning">
              {cartLimitMessage}
            </div>
          )}

          <div className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-black tracking-wide text-text-on-dark sm:text-4xl md:text-5xl md:tracking-wider">
                КОРЗИНА
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {totalItems} {itemsWord(totalItems)} на сумму{' '}
                <span className="font-bold text-text-on-dark tabular-nums">{formatPrice(totalPrice)}</span>
              </p>
            </div>
            <button
              onClick={clearCart}
              className="inline-flex shrink-0 self-start items-center gap-1.5 rounded-full border border-border-on-dark bg-elevated px-3 py-2 text-xs text-text-muted transition-colors hover:border-status-danger/40 hover:text-status-danger sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Очистить
            </button>
          </div>

          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="stagger-fade min-w-0 space-y-3">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>

            <aside className="min-w-0 w-full lg:sticky lg:top-[6rem] lg:self-start">
              <div className="surface-card box-border min-w-0 w-full max-w-full rounded-3xl p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-display text-base font-bold tracking-wider text-text-muted">
                    ИТОГО
                  </span>
                  <span className="font-display text-3xl font-extrabold tabular-nums text-text-on-dark">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="mb-3 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
                    МЕСТО ПОЛУЧЕНИЯ
                  </h3>
                  <PickupLocationSelector collapseToken={selectorCollapse} layout="narrow" />
                </div>

                <button
                  type="button"
                  onClick={handleProceed}
                  disabled={!canProceedToCheckout}
                  className={cn(
                    'flex h-14 w-full items-center justify-center gap-2 rounded-full',
                    'font-display text-base font-extrabold uppercase tracking-wider transition-all duration-200',
                    canProceedToCheckout
                      ? 'bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30 hover:shadow-accent-primary/50 active:scale-[0.98]'
                      : 'cursor-not-allowed bg-card-inner text-text-faint',
                  )}
                >
                  <span>Выбрать дату и время</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <p className="mt-4 text-center text-xs text-text-faint">
                  Оплата при получении.
                </p>
              </div>
            </aside>
          </div>
        </PageContainer>
      </main>

      <DeliveryConfirmDialog open={deliveryConfirmOpen} onOpenChange={setDeliveryConfirmOpen} />

      <div
        className="fixed inset-x-0 bottom-0 z-30 box-border border-t border-border-on-dark bg-canvas/95 pt-3 backdrop-blur-sm lg:hidden pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={handleProceed}
          disabled={!canProceedToCheckout}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-full',
            'font-display text-sm font-extrabold uppercase tracking-wider transition-all duration-200',
            canProceedToCheckout
              ? 'bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30 active:scale-[0.98]'
              : 'cursor-not-allowed bg-card-inner text-text-faint',
          )}
        >
          <span>Выбрать дату и время</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <Footer compact />
    </div>
  )
}

function itemsWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'товара'
  return 'товаров'
}
