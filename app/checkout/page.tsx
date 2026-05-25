'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, MapPin, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, formatDate } from '@/lib/mock-data'
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

    const scheduledAt = new Date(`${pickupDate}T${pickupTime}:00`).toISOString()

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
          scheduledAt: new Date(`${pickupDate}T${pickupTime}:00`).toISOString(),
          items: items.map(i => ({
            brand: i.product.brand,
            flavor: i.product.flavor,
            retailPrice: i.product.retailPrice,
            quantity: i.quantity,
          })),
          total: totalPrice,
        }),
      )

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
            <h2 className="font-display text-2xl font-bold text-text-on-dark">КОРЗИНА ПУСТА</h2>
            <p className="mt-2 text-text-muted">Добавьте товары для оформления</p>
            <Link
              href="/"
              className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-accent-primary px-6 font-display text-sm font-bold uppercase tracking-wider text-text-on-accent"
            >
              В каталог
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

      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <PageContainer maxWidth="checkout">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-on-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад в корзину</span>
          </Link>

          <h1 className="mb-8 font-display text-3xl font-bold tracking-wider text-text-on-dark md:text-4xl">
            ОФОРМЛЕНИЕ
          </h1>

          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-5">
            <div className="order-1 space-y-8 lg:order-none lg:col-span-3">
              <div>
                <h3 className="mb-4 font-display text-sm font-bold tracking-wider text-text-muted">
                  ВАШ ЗАКАЗ
                </h3>
                <div className="rounded-3xl bg-card p-4">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card-inner">
                            <span className="text-xs font-bold text-text-on-dark">
                              {item.product.brand.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-on-card">{item.product.brand}</span>
                            <span className="text-text-muted"> x{item.quantity}</span>
                          </div>
                        </div>
                        <span className="font-medium tabular-nums text-text-on-card">
                          {formatPrice(item.product.retailPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
                    <span className="text-text-muted">Итого ({totalItems} шт.)</span>
                    <span className="text-lg font-bold tabular-nums text-text-on-card">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-display text-sm font-bold tracking-wider text-text-muted">
                  ТОЧКА ВЫДАЧИ
                </h3>
                {isPickupSelected && !isChangingLocation ? (
                  <div className="flex items-center gap-4 rounded-3xl bg-card p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-primary">
                      <MapPin className="h-5 w-5 text-text-on-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text-on-card">
                        {locationLabel ?? 'Точка выбрана'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingLocation(true)}
                      className="shrink-0 text-sm font-medium text-accent-primary hover:underline"
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
              <div className="rounded-3xl bg-card p-6 lg:sticky lg:top-[4.5rem]">
                <h3 className="mb-4 font-display text-lg font-bold tracking-wider text-text-on-card">
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
                  <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {submitError}
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between border-t border-border-subtle pt-4">
                  <span className="font-display font-bold text-text-on-card">ИТОГО</span>
                  <span className="text-2xl font-bold tabular-nums text-text-on-card">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className={cn(
                    'flex h-14 w-full items-center justify-center gap-2 rounded-full',
                    'font-display text-base font-bold uppercase tracking-wider',
                    'transition-all duration-200',
                    canSubmit && !isSubmitting
                      ? 'bg-accent-primary text-text-on-accent hover:bg-accent-hover active:scale-[0.98]'
                      : 'cursor-not-allowed bg-status-disabled text-text-muted',
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
                      <span>Оформляем...</span>
                    </>
                  ) : (
                    <>
                      <span>Подтвердить бронь</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <p className="mt-4 text-center text-xs text-text-muted">
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
          'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
          checked ? 'bg-status-success' : 'bg-card-inner',
        )}
      >
        {checked && <Check className="h-4 w-4 text-text-on-accent" />}
      </div>
      <div className="flex-1">
        <span className={cn('text-sm', checked ? 'text-text-on-card' : 'text-text-muted')}>
          {label}
        </span>
        {value && <span className="ml-2 text-sm font-medium text-accent-primary">{value}</span>}
      </div>
    </div>
  )
}
