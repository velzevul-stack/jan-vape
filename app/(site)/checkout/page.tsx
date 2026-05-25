'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, MapPin, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, formatDate } from '@/lib/mock-data'
import { buildStoreDateTime } from '@/lib/dates'
import { useCart } from '@/lib/context/cart-context'
import { useBooking } from '@/lib/context/booking-context'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { DatePickerStrip } from '@/components/checkout/DatePickerStrip'
import { TimeSlotGrid } from '@/components/checkout/TimeSlotGrid'
import { ContactForm } from '@/components/checkout/ContactForm'
import { PickupLocationSelector } from '@/components/checkout/PickupLocationSelector'
import { PageContainer } from '@/components/layout/PageContainer'
import { isValidTelegramUsername, normalizeTelegramUsername } from '@/lib/telegram'
import { mutate } from 'swr'
import { usePickupLocations } from '@/lib/api/hooks/usePickupLocations'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalItems, totalPrice, clearCart } = useCart()
  const { locations } = usePickupLocations()
  const {
    pickupLocationId,
    customAddressText,
    pickupDate,
    pickupTime,
    customerName,
    customerTelegram,
    comment,
    isPickupSelected,
    isSlotSelected,
    resetBooking,
  } = useBooking()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangingLocation, setIsChangingLocation] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isNameValid = customerName.trim().length >= 2
  const isTelegramValid = isValidTelegramUsername(customerTelegram)
  const canSubmit =
    isPickupSelected && isSlotSelected && isNameValid && isTelegramValid && items.length > 0

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting || !pickupDate || !pickupTime) return

    setIsSubmitting(true)
    setSubmitError(null)

    const scheduledAt = buildStoreDateTime(pickupDate, pickupTime).toISOString()

    const body = {
      ...(pickupLocationId ? { pickupLocationId } : {}),
      ...(customAddressText ? { customAddressText } : {}),
      scheduledAt,
      customerName: customerName.trim(),
      customerTelegram: normalizeTelegramUsername(customerTelegram),
      comment: comment.trim() || undefined,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        retailPriceSnapshot: item.product.retailPrice,
      })),
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        setSubmitError('Это время уже занято. Пожалуйста, выберите другое.')
        await mutate(
          (key: string) => typeof key === 'string' && key.startsWith('/api/slots'),
          undefined,
          { revalidate: true },
        )
        setIsSubmitting(false)
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSubmitError(err.error ?? 'Произошла ошибка. Попробуйте ещё раз.')
        setIsSubmitting(false)
        return
      }

      const data = await res.json()
      const bookingNumber = data.publicNumber as string

      const resolvedLocation = locations.find(l => l.id === pickupLocationId)
      const locationLabel = resolvedLocation?.name ?? customAddressText ?? null

      sessionStorage.setItem(
        `confirmation-${bookingNumber}`,
        JSON.stringify({
          publicNumber: bookingNumber,
          customerName: customerName.trim(),
          customerTelegram: normalizeTelegramUsername(customerTelegram),
          locationLabel,
          scheduledAt: buildStoreDateTime(pickupDate, pickupTime).toISOString(),
          items: items.map(i => ({
            brand: i.product.brand,
            flavor: i.product.flavor,
            retailPrice: i.product.retailPrice,
            quantity: i.quantity,
          })),
          total: totalPrice,
        }),
      )

      await Promise.all([
        mutate(
          (key: string) => typeof key === 'string' && key.startsWith('/api/slots'),
          undefined,
          { revalidate: true },
        ),
        mutate(
          (key: string) => typeof key === 'string' && key.startsWith('/api/catalog'),
          undefined,
          { revalidate: true },
        ),
      ])

      clearCart()
      resetBooking()

      router.push(`/confirmation/${bookingNumber}`)
    } catch {
      setSubmitError('Ошибка сети. Проверьте подключение и попробуйте ещё раз.')
      setIsSubmitting(false)
    }
  }, [
    canSubmit,
    isSubmitting,
    pickupDate,
    pickupTime,
    pickupLocationId,
    customAddressText,
    customerName,
    customerTelegram,
    comment,
    items,
    totalPrice,
    locations,
    clearCart,
    resetBooking,
    router,
  ])

  const locationLabel = customAddressText ?? null

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-wider text-text-on-dark">КОРЗИНА ПУСТА</h2>
            <p className="mt-2 text-text-muted">Добавьте товары для оформления</p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent-primary px-6 font-display text-sm font-extrabold uppercase tracking-wider text-text-on-accent shadow-lg shadow-accent-primary/30"
            >
              В каталог
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 px-4 py-6 md:px-6 md:py-10">
        <PageContainer maxWidth="checkout">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-accent-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад в корзину</span>
          </Link>

          <h1 className="mb-8 font-display text-4xl font-black tracking-wider text-text-on-dark md:text-5xl">
            ОФОРМЛЕНИЕ
          </h1>

          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-5">
            <div className="order-1 space-y-8 lg:order-none lg:col-span-3">
              <div>
                <h3 className="mb-4 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
                  ВАШ ЗАКАЗ
                </h3>
                <div className="rounded-3xl border border-border-on-dark bg-elevated p-5">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card-inner">
                            <span className="text-xs font-bold tabular-nums text-text-on-dark">
                              {item.product.brand.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-on-dark">{item.product.brand}</span>
                            <span className="text-text-muted"> × {item.quantity}</span>
                          </div>
                        </div>
                        <span className="font-medium tabular-nums text-text-on-dark">
                          {formatPrice(item.product.retailPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border-on-dark pt-4">
                    <span className="text-text-muted">Итого ({totalItems} шт.)</span>
                    <span className="font-display text-xl font-extrabold tabular-nums text-accent-soft">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
                  ТОЧКА ВЫДАЧИ
                </h3>
                {isPickupSelected && !isChangingLocation ? (
                  <div className="flex items-center gap-4 rounded-3xl border border-accent-primary/30 bg-elevated p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-primary shadow-lg shadow-accent-primary/30">
                      <MapPin className="h-5 w-5 text-text-on-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text-on-dark">
                        {locationLabel ?? 'Точка выбрана'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingLocation(true)}
                      className="shrink-0 rounded-full bg-card-inner px-3 py-1.5 text-sm font-medium text-accent-soft hover:bg-accent-mist"
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <PickupLocationSelector />
                )}
              </div>

              <DatePickerStrip />

              <TimeSlotGrid />

              <ContactForm />
            </div>

            <div className="order-2 lg:order-none lg:col-span-2">
              <div className="surface-card rounded-3xl p-6 lg:sticky lg:top-[6rem]">
                <h3 className="mb-4 font-display text-lg font-extrabold tracking-wider text-text-on-dark">
                  СВОДКА
                </h3>

                <div className="mb-6 space-y-3">
                  <ChecklistItem
                    checked={isPickupSelected}
                    label="Точка выдачи"
                    value={isPickupSelected ? (locationLabel ?? 'Точка выбрана') : undefined}
                  />
                  <ChecklistItem
                    checked={!!pickupDate}
                    label="Дата"
                    value={pickupDate ? formatDate(pickupDate) : undefined}
                  />
                  <ChecklistItem
                    checked={!!pickupTime}
                    label="Время"
                    value={pickupTime ?? undefined}
                  />
                  <ChecklistItem
                    checked={isNameValid}
                    label="Имя"
                    value={isNameValid ? customerName : undefined}
                  />
                  <ChecklistItem
                    checked={isTelegramValid}
                    label="Telegram"
                    value={isTelegramValid ? normalizeTelegramUsername(customerTelegram) : undefined}
                  />
                </div>

                {submitError && (
                  <div className="mb-4 rounded-2xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                    {submitError}
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between border-t border-border-on-dark pt-4">
                  <span className="font-display font-bold tracking-wider text-text-muted">ИТОГО</span>
                  <span className="font-display text-3xl font-extrabold tabular-nums text-text-on-dark">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className={cn(
                    'flex h-14 w-full items-center justify-center gap-2 rounded-full',
                    'font-display text-base font-extrabold uppercase tracking-wider',
                    'transition-all duration-200',
                    canSubmit && !isSubmitting
                      ? 'bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30 hover:shadow-accent-primary/50 active:scale-[0.98]'
                      : 'cursor-not-allowed bg-card-inner text-text-faint',
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-on-accent border-t-transparent" />
                      <span>Оформляем…</span>
                    </>
                  ) : (
                    <>
                      <span>Подтвердить бронь</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <p className="mt-4 text-center text-xs text-text-faint">
                  Оплата при получении в магазине
                </p>
              </div>
            </div>
          </div>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}

function ChecklistItem({
  checked,
  label,
  value,
}: {
  checked: boolean
  label: string
  value?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
          checked
            ? 'bg-status-success text-text-on-accent shadow-md shadow-status-success/40'
            : 'bg-card-inner text-text-faint',
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-sm',
            checked ? 'text-text-on-dark' : 'text-text-muted',
          )}
        >
          {label}
        </span>
        {value && (
          <span className="ml-2 truncate text-sm font-medium text-accent-soft">
            {value}
          </span>
        )}
      </div>
    </div>
  )
}
