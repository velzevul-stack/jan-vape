'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { CheckCircle, MapPin, Calendar, Clock, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, formatDate } from '@/lib/mock-data'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageContainer } from '@/components/layout/PageContainer'

interface ConfirmationItem {
  brand: string
  flavor: string
  retailPrice: number
  quantity: number
}

interface ConfirmationSnapshot {
  publicNumber: string
  customerName: string
  customerTelegram: string
  locationLabel: string | null
  scheduledAt: string
  items: ConfirmationItem[]
  total: number
  deliveryFee?: number
  deliveryZoneName?: string | null
}

interface ConfirmationPageProps {
  params: Promise<{ publicNumber: string }>
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { publicNumber } = use(params)
  const [snapshot, setSnapshot] = useState<ConfirmationSnapshot | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(`confirmation-${publicNumber}`)
    if (raw) {
      try {
        setSnapshot(JSON.parse(raw))
      } catch {
        return
      }
    }
  }, [publicNumber])

  const scheduledDate = snapshot ? new Date(snapshot.scheduledAt) : null
  const dateLabel = scheduledDate ? formatDate(scheduledDate) : null
  const timeLabel = scheduledDate
    ? scheduledDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Minsk',
      })
    : null

  if (!snapshot) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-text-on-dark">
              ЗАЯВКА НА БРОНЬ НЕ НАЙДЕНА
            </h2>
            <p className="mt-2 text-text-muted">
              Данные доступны только в текущей сессии браузера
            </p>
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
        <PageContainer maxWidth="narrow">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-status-success/20">
              <CheckCircle className="h-10 w-10 text-status-success" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-wider text-text-on-dark md:text-4xl">
              ЗАЯВКА ОТПРАВЛЕНА
            </h1>
            <p className="mt-2 text-text-muted">
              Ожидайте подтверждения от продавца
            </p>
          </div>

          <div className="mb-6 rounded-3xl border border-accent-primary/30 bg-accent-mist p-6 text-center">
            <div className="mb-3 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20 text-accent-soft">
                <Send className="h-5 w-5" />
              </span>
            </div>
            <h2 className="font-display text-base font-bold tracking-wider text-text-on-dark md:text-lg">
              Мы напишем в Telegram, как только подтвердим время
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Продавец подтверждает каждую бронь вручную. Это обычно занимает несколько минут.
            </p>
          </div>

          <div className="mb-4">
            <h3 className="mb-3 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
              ВЫ ЗАПРОСИЛИ
            </h3>
          </div>

          <div className="mb-6 space-y-4">
            {snapshot.locationLabel && (
              <div className="flex items-center gap-4 rounded-2xl bg-elevated p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20">
                  <MapPin className="h-5 w-5 text-accent-primary" />
                </div>
                <div>
                  <div className="text-sm text-text-muted">Точка выдачи</div>
                  <div className="font-medium text-text-on-dark">{snapshot.locationLabel}</div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl bg-elevated p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20">
                  <Calendar className="h-5 w-5 text-accent-primary" />
                </div>
                <div>
                  <div className="text-sm text-text-muted">Дата</div>
                  <div className="font-medium text-text-on-dark">{dateLabel}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-elevated p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20">
                  <Clock className="h-5 w-5 text-accent-primary" />
                </div>
                <div>
                  <div className="text-sm text-text-muted">Желаемое время</div>
                  <div className="font-medium text-text-on-dark">{timeLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-3xl bg-card p-6">
            <h3 className="mb-4 font-display text-sm font-bold tracking-wider text-text-muted">
              СОСТАВ ЗАКАЗА
            </h3>
            <div className="space-y-3">
              {snapshot.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card-inner">
                      <span className="text-xs font-bold text-text-on-dark">
                        {item.brand.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm text-text-on-card">{item.brand}</div>
                      <div className="text-xs text-text-muted">{item.flavor}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums text-text-on-card">
                      {formatPrice(item.retailPrice * item.quantity)}
                    </div>
                    <div className="text-xs text-text-muted">x{item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-border-subtle pt-4">
              {(snapshot.deliveryFee ?? 0) > 0 && (
                <div className="flex items-center justify-between text-sm text-text-muted">
                  <span>Доставка{snapshot.deliveryZoneName ? ` (${snapshot.deliveryZoneName})` : ''}</span>
                  <span className="tabular-nums text-text-on-card">{formatPrice(snapshot.deliveryFee ?? 0)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-text-on-card">ИТОГО К ОПЛАТЕ</span>
                <span className="text-xl font-bold tabular-nums text-text-on-card">
                  {formatPrice(snapshot.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-2xl bg-elevated p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-text-muted">Имя</div>
                <div className="font-medium text-text-on-dark">{snapshot.customerName}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Telegram для связи</div>
                <div className="font-medium text-text-on-dark">{snapshot.customerTelegram}</div>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className={cn(
              'flex h-14 w-full items-center justify-center gap-2 rounded-full',
              'bg-accent-primary font-display text-base font-bold uppercase tracking-wider text-text-on-accent',
              'transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            Вернуться в каталог
          </Link>

          <p className="mt-4 text-center text-sm text-text-muted">
            Оплата при получении в магазине
          </p>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
