'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import { useCart } from '@/lib/context/cart-context'
import { useBooking } from '@/lib/context/booking-context'
import { useCatalog } from '@/lib/api/hooks/useCatalog'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartItem, EmptyCart } from '@/components/cart/CartItem'
import { CartProductLines } from '@/components/cart/CartProductLines'
import { PickupLocationSelector } from '@/components/checkout/PickupLocationSelector'
import { PageContainer } from '@/components/layout/PageContainer'

export default function CartPage() {
  const { items, totalItems, totalPrice, clearCart, syncWithCatalog, cartLimitMessage } = useCart()
  const { isLocationSelected } = useBooking()
  const { products } = useCatalog({}, { refreshInterval: 5_000 })

  useEffect(() => {
    if (products.length > 0) {
      syncWithCatalog(products)
    }
  }, [products, syncWithCatalog])

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <EmptyCart />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 px-4 py-6 md:px-6 md:py-10">
        <PageContainer maxWidth="cart">
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

          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-black tracking-wider text-text-on-dark md:text-5xl">
                КОРЗИНА
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {totalItems} {itemsWord(totalItems)} на сумму{' '}
                <span className="font-bold text-text-on-dark tabular-nums">{formatPrice(totalPrice)}</span>
              </p>
            </div>
            <button
              onClick={clearCart}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-on-dark bg-elevated px-3 py-2 text-xs text-text-muted transition-colors hover:border-status-danger/40 hover:text-status-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Очистить
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="stagger-fade space-y-3">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>

            <aside className="lg:sticky lg:top-[6rem] lg:self-start">
              <div className="surface-card rounded-3xl p-6">
                <div className="mb-4 space-y-3 border-b border-border-on-dark pb-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-start justify-between gap-3 text-sm">
                      <CartProductLines
                        product={item.product}
                        quantity={item.quantity}
                        brandClassName="text-sm font-medium"
                        flavorClassName="text-xs"
                      />
                      <span className="shrink-0 font-medium tabular-nums text-text-on-dark">
                        {formatPrice(item.product.retailPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
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
                    ТОЧКА ВЫДАЧИ
                  </h3>
                  <PickupLocationSelector />
                </div>

                <Link
                  href={isLocationSelected ? '/checkout' : '#'}
                  onClick={(e) => !isLocationSelected && e.preventDefault()}
                  className={cn(
                    'flex h-14 w-full items-center justify-center gap-2 rounded-full',
                    'font-display text-base font-extrabold uppercase tracking-wider transition-all duration-200',
                    isLocationSelected
                      ? 'bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30 hover:shadow-accent-primary/50 active:scale-[0.98]'
                      : 'cursor-not-allowed bg-card-inner text-text-faint',
                  )}
                >
                  <span>Выбрать дату и время</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <p className="mt-4 text-center text-xs text-text-faint">
                  Оплата при получении. Бронь действительна 24 часа.
                </p>
              </div>
            </aside>
          </div>
        </PageContainer>
      </main>

      <Footer />
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
