'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, MapPin, Truck, Check } from 'lucide-react'
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
import { CartProductLines } from '@/components/cart/CartProductLines'
import { PageContainer } from '@/components/layout/PageContainer'
import { isValidTelegramUsername, normalizeTelegramUsername } from '@/lib/telegram'
import { mutate } from 'swr'
import { usePickupLocations } from '@/lib/api/hooks/usePickupLocations'
import { useCatalog } from '@/lib/api/hooks/useCatalog'
import { fetchCatalogFresh, resolveCartLinesAgainstCatalog } from '@/lib/api/catalogClient'
import { addRecentAddress } from '@/lib/recentAddresses'

const CATALOG_REFRESH_MS = 5_000

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalItems, totalPrice, clearCart, syncWithCatalog } = useCart()
  const { products } = useCatalog({}, { refreshInterval: CATALOG_REFRESH_MS })
  const { locations } = usePickupLocations()
  const orderItems = useMemo(
    () =>
      items.map((item) => {
        const fresh = products.find((p) => p.id === item.product.id)
        if (!fresh) return item
        return {
          ...item,
          product: {
            ...item.product,
            ...fresh,
          },
        }
      }),
    [items, products],
  )

  useEffect(() => {
    if (products.length > 0) {
      syncWithCatalog(products)
    }
  }, [products, syncWithCatalog])

  const {
    pickupLocationId,
    customAddressText,
    pickupDate,
    pickupTime,
    customerName,
    customerTelegram,
    comment,
    deliveryZone,
    deliveryZoneHint,
    deliveryFee,
    fullDeliveryAddress,
    isPickupSelected,
    isDeliverySelected,
    isDeliveryDraft,
    isSlotSelected,
    setDeliveryZoneHint,
    clearDeliveryConfirmation,
    setPickupDate,
    setPickupTime,
    resetBooking,
  } = useBooking()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (items.length === 0) return
    if (!isPickupSelected && !isDeliverySelected) {
      router.replace('/cart')
    }
  }, [items.length, isPickupSelected, isDeliverySelected, router])

  const handleChangeFulfillment = useCallback(() => {
    if (isDeliverySelected) {
      clearDeliveryConfirmation()
      setDeliveryZoneHint(null)
    }
    setPickupDate(null)
    setPickupTime(null)
    router.push('/cart')
  }, [
    clearDeliveryConfirmation,
    isDeliverySelected,
    router,
    setDeliveryZoneHint,
    setPickupDate,
    setPickupTime,
  ])

  const isNameValid = customerName.trim().length >= 2
  const isTelegramValid = isValidTelegramUsername(customerTelegram)
  const fulfillmentReady = isPickupSelected || isDeliverySelected
  const canSubmit =
    fulfillmentReady && isSlotSelected && isNameValid && isTelegramValid && items.length > 0
  const confirmedDeliveryFee = isDeliverySelected ? deliveryFee : 0
  const orderTotal = totalPrice + confirmedDeliveryFee

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting || !pickupDate || !pickupTime) return

    setIsSubmitting(true)
    setSubmitError(null)

    const scheduledAt = buildStoreDateTime(pickupDate, pickupTime).toISOString()

    let catalog
    try {
      catalog = await fetchCatalogFresh()
    } catch {
      setSubmitError('Не удалось обновить каталог. Попробуйте ещё раз.')
      setIsSubmitting(false)
      return
    }

    const { lines, removed, adjusted } = resolveCartLinesAgainstCatalog(items, catalog.products)
    if (removed.length > 0 || adjusted.length > 0) {
      syncWithCatalog(catalog.products)
      setSubmitError('Состав корзины изменился — проверьте доступность товаров и попробуйте снова.')
      setIsSubmitting(false)
      return
    }

    if (lines.length === 0) {
      setSubmitError('В корзине нет доступных товаров.')
      setIsSubmitting(false)
      return
    }

    const body = {
      ...(pickupLocationId ? { pickupLocationId } : {}),
      ...(customAddressText && deliveryZone ? {
        customAddressText,
        deliveryZoneId: deliveryZone.id,
      } : {}),
      scheduledAt,
      customerName: customerName.trim(),
      customerTelegram: normalizeTelegramUsername(customerTelegram),
      comment: comment.trim() || undefined,
      items: lines.map((item) => ({
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 409) {
          const errCode = err.code as string | undefined
          if (errCode === 'delivery_slot_busy') {
            setSubmitError('Это время доставки уже занято. Выберите другое время.')
          } else {
            await mutate(
              (key: string) => typeof key === 'string' && key.startsWith('/api/catalog'),
              undefined,
              { revalidate: true },
            )
            syncWithCatalog(catalog.products)
            setSubmitError('Недостаточно товара на посту. Корзина обновлена — проверьте заказ.')
          }
        } else {
          setSubmitError(err.error ?? 'Произошла ошибка. Попробуйте ещё раз.')
        }
        setIsSubmitting(false)
        return
      }

      const data = await res.json()
      const bookingNumber = data.publicNumber as string

      const resolvedLocation = locations.find(l => l.id === pickupLocationId)
      const locationLabel = resolvedLocation?.name ?? customAddressText ?? null

      if (customAddressText) {
        addRecentAddress(customAddressText)
      }

      sessionStorage.setItem(
        `confirmation-${bookingNumber}`,
        JSON.stringify({
          publicNumber: bookingNumber,
          customerName: customerName.trim(),
          customerTelegram: normalizeTelegramUsername(customerTelegram),
          locationLabel,
          scheduledAt: buildStoreDateTime(pickupDate, pickupTime).toISOString(),
          items: lines.map((i) => ({
            brand: i.product.brand,
            flavor: i.product.flavor,
            retailPrice: i.product.retailPrice,
            quantity: i.quantity,
          })),
          total: orderTotal,
          deliveryFee: confirmedDeliveryFee,
          deliveryZoneName: deliveryZone?.name ?? null,
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
    deliveryZone,
    orderTotal,
    confirmedDeliveryFee,
    customerName,
    customerTelegram,
    comment,
    items,
    totalPrice,
    syncWithCatalog,
    locations,
    clearCart,
    resetBooking,
    router,
  ])

  const locationLabel =
    customAddressText ??
    (fullDeliveryAddress.trim() || null) ??
    locations.find((l) => l.id === pickupLocationId)?.name ??
    null

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

      <main className="flex-1 px-4 py-6 pb-28 md:px-6 md:py-10 lg:pb-10">
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
            <div className="space-y-8 lg:col-span-3">
              <div>
                <h3 className="mb-4 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
                  ВАШ ЗАКАЗ
                </h3>
                <div className="rounded-3xl border border-border-on-dark bg-elevated p-5">
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.product.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card-inner">
                            <span className="text-xs font-bold tabular-nums text-text-on-dark">
                              {item.product.brand.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <CartProductLines
                            product={item.product}
                            quantity={item.quantity}
                            brandClassName="text-sm font-semibold"
                            flavorClassName="text-sm text-text-muted"
                          />
                        </div>
                        <span className="shrink-0 pt-1 font-medium tabular-nums text-text-on-dark">
                          {formatPrice(item.product.retailPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-border-on-dark pt-4">
                    {isDeliverySelected && confirmedDeliveryFee > 0 && (
                      <div className="flex items-center justify-between text-sm text-text-muted">
                        <span>Доставка{deliveryZone ? ` (${deliveryZone.name})` : ''}</span>
                        <span className="tabular-nums text-text-on-dark">{formatPrice(confirmedDeliveryFee)}</span>
                      </div>
                    )}
                    {isDeliverySelected && confirmedDeliveryFee === 0 && (
                      <div className="flex items-center justify-between text-sm text-text-muted">
                        <span>Доставка{deliveryZone ? ` (${deliveryZone.name})` : ''}</span>
                        <span className="text-status-success">бесплатно</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Итого ({totalItems} шт.)</span>
                      <span className="font-display text-xl font-extrabold tabular-nums text-accent-soft">
                        {formatPrice(orderTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
                  {isDeliverySelected && !isPickupSelected ? 'АДРЕС ДОСТАВКИ' : 'МЕСТО ПОЛУЧЕНИЯ'}
                </h3>
                {(isPickupSelected || isDeliverySelected) ? (
                  <div className="flex items-center gap-4 rounded-3xl border border-accent-primary/30 bg-elevated p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-primary shadow-lg shadow-accent-primary/30">
                      {isDeliverySelected ? (
                        <Truck className="h-5 w-5 text-text-on-accent" />
                      ) : (
                        <MapPin className="h-5 w-5 text-text-on-accent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text-on-dark">
                        {locationLabel ?? 'Выбрано'}
                      </div>
                      {isDeliverySelected && deliveryZone && (
                        <p className="mt-1 text-xs text-text-muted">
                          {deliveryZone.name}
                          {' · '}
                          {confirmedDeliveryFee > 0
                            ? formatPrice(confirmedDeliveryFee)
                            : 'бесплатно'}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangeFulfillment}
                      className="shrink-0 rounded-full bg-card-inner px-3 py-1.5 text-sm font-medium text-accent-soft hover:bg-accent-mist"
                    >
                      Изменить
                    </button>
                  </div>
                ) : null}
              </div>

              <DatePickerStrip />

              <TimeSlotGrid />

              <ContactForm />
            </div>

            <div className="hidden lg:block lg:col-span-2">
              <div className="surface-card rounded-3xl p-6 lg:sticky lg:top-[6rem]">
                <h3 className="mb-4 font-display text-lg font-extrabold tracking-wider text-text-on-dark">
                  СВОДКА
                </h3>

                <div className="mb-5 space-y-2.5 border-b border-border-on-dark pb-5">
                  {orderItems.map((item) => (
                    <div key={item.product.id} className="flex items-start justify-between gap-3">
                      <CartProductLines
                        product={item.product}
                        quantity={item.quantity}
                        brandClassName="text-sm font-medium"
                        flavorClassName="text-xs text-accent-soft/90"
                      />
                      <span className="shrink-0 pt-0.5 text-sm font-medium tabular-nums text-text-on-dark">
                        {formatPrice(item.product.retailPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mb-6 space-y-3">
                  <ChecklistItem
                    checked={isPickupSelected || isDeliveryDraft}
                    label={isDeliverySelected || isDeliveryDraft ? 'Доставка' : 'Точка выдачи'}
                    value={(isPickupSelected || isDeliveryDraft) ? (locationLabel ?? 'Выбрано') : undefined}
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

                {isDeliverySelected && confirmedDeliveryFee > 0 && (
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-text-muted">Доставка</span>
                    <span className="font-medium tabular-nums text-text-on-dark">{formatPrice(confirmedDeliveryFee)}</span>
                  </div>
                )}
                {isDeliverySelected && confirmedDeliveryFee === 0 && (
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-text-muted">Доставка</span>
                    <span className="font-medium text-status-success">бесплатно</span>
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between border-t border-border-on-dark pt-4">
                  <span className="font-display font-bold tracking-wider text-text-muted">ИТОГО</span>
                  <span className="font-display text-3xl font-extrabold tabular-nums text-text-on-dark">
                    {formatPrice(orderTotal)}
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
                  Оплата при получении
                </p>
              </div>
            </div>
          </div>
        </PageContainer>
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-on-dark bg-canvas/95 px-4 pt-3 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {submitError && (
          <p className="mb-2 rounded-xl bg-status-danger/10 px-3 py-1.5 text-xs text-status-danger">
            {submitError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <p className="text-[10px] font-bold tracking-[0.15em] text-text-muted">ИТОГО</p>
            <p className="font-display text-xl font-extrabold tabular-nums text-text-on-dark">
              {formatPrice(orderTotal)}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              'flex h-12 flex-1 items-center justify-center gap-2 rounded-full',
              'font-display text-sm font-extrabold uppercase tracking-wider transition-all duration-200',
              canSubmit && !isSubmitting
                ? 'bg-accent-primary text-text-on-accent shadow-lg shadow-accent-primary/30 active:scale-[0.98]'
                : 'cursor-not-allowed bg-card-inner text-text-faint',
            )}
          >
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-on-accent border-t-transparent" />
            ) : (
              'Подтвердить бронь'
            )}
          </button>
        </div>
      </div>

      <Footer compact />
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
