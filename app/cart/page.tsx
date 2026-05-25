'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import { useCart } from '@/lib/context/cart-context'
import { useBooking } from '@/lib/context/booking-context'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartItem, EmptyCart } from '@/components/cart/CartItem'
import { PickupLocationSelector } from '@/components/checkout/PickupLocationSelector'
import { PageContainer } from '@/components/layout/PageContainer'

export default function CartPage() {
  const { items, totalItems, totalPrice, clearCart } = useCart()
  const { isPickupSelected } = useBooking()

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

      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <PageContainer maxWidth="cart">
          {/* Back Link */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-on-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад в каталог</span>
          </Link>

          {/* Title */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-display text-3xl font-bold tracking-wider text-text-on-dark md:text-4xl">
              КОРЗИНА
            </h1>
            <button
              onClick={clearCart}
              className="text-sm text-text-muted hover:text-status-warning"
            >
              Очистить
            </button>
          </div>

          {/* Cart Items */}
          <div className="mb-8 space-y-4">
            {items.map((item) => (
              <CartItem key={item.product.id} item={item} />
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-3xl bg-card p-6">
            <div className="mb-4 flex items-center justify-between text-text-on-card">
              <span className="text-text-muted">Товаров</span>
              <span className="font-medium">{totalItems} шт.</span>
            </div>
            <div className="mb-6 flex items-center justify-between border-t border-border-subtle pt-4">
              <span className="font-display text-lg font-bold tracking-wider text-text-on-card">
                ИТОГО
              </span>
              <span className="text-2xl font-bold tabular-nums text-text-on-card">
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* Pickup location */}
            <div className="mb-6">
              <h3 className="mb-3 font-display text-sm font-bold tracking-wider text-text-muted">
                ТОЧКА ВЫДАЧИ
              </h3>
              <PickupLocationSelector />
            </div>

            {/* CTA */}
            <Link
              href={isPickupSelected ? '/checkout' : '#'}
              onClick={(e) => !isPickupSelected && e.preventDefault()}
              className={cn(
                'flex h-14 w-full items-center justify-center gap-2 rounded-full',
                'font-display text-base font-bold uppercase tracking-wider',
                'transition-all duration-200',
                isPickupSelected
                  ? 'bg-accent-primary text-text-on-accent hover:bg-accent-hover active:scale-[0.98]'
                  : 'cursor-not-allowed bg-status-disabled text-text-muted'
              )}
            >
              <span>Выбрать дату и время</span>
              <ArrowRight className="h-5 w-5" />
            </Link>

            <p className="mt-4 text-center text-xs text-text-muted">
              Оплата при получении. Бронь действительна 24 часа.
            </p>
          </div>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
