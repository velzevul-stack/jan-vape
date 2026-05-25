'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { CheckCircle, MapPin, Calendar, Clock, Copy, Check } from 'lucide-react'
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
}

interface ConfirmationPageProps {
  params: Promise<{ publicNumber: string }>
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { publicNumber } = use(params)
  const [snapshot, setSnapshot] = useState<ConfirmationSnapshot | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(`confirmation-${publicNumber}`)
    if (raw) {
      try {
        setSnapshot(JSON.parse(raw))
      } catch {
        /* ignore */
      }
    }
  }, [publicNumber])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scheduledDate = snapshot ? new Date(snapshot.scheduledAt) : null
  const dateLabel = scheduledDate ? formatDate(scheduledDate) : null
  const timeLabel = scheduledDate
    ? scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : null

  if (!snapshot) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-text-on-dark">
              БРОНИРОВАНИЕ НЕ НАЙДЕНО
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
              БРОНЬ ОФОРМЛЕНА
            </h1>
            <p className="mt-2 text-text-muted">
              Ожидаем вас в указанное время
            </p>
          </div>

          <div className="mb-6 rounded-3xl bg-card p-6 text-center">
            <div className="mb-2 text-sm text-text-muted">Номер бронирования</div>
            <div className="flex items-center justify-center gap-3">
              <span className="font-display text-2xl font-bold tracking-wider text-text-on-card md:text-3xl">
                {publicNumber}
              </span>
              <button
                onClick={copyToClipboard}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                  copied
                    ? 'bg-status-success text-text-on-accent'
                    : 'bg-card-inner text-text-on-dark hover:bg-accent-primary hover:text-text-on-accent'
                )}
                aria-label="Копировать"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Назовите этот номер продавцу при получении
            </p>
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
                  <div className="text-sm text-text-muted">Время</div>
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
            <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
              <span className="font-display font-bold text-text-on-card">ИТОГО К ОПЛАТЕ</span>
              <span className="text-xl font-bold tabular-nums text-text-on-card">
                {formatPrice(snapshot.total)}
              </span>
            </div>
          </div>

          <div className="mb-8 rounded-2xl bg-elevated p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-text-muted">Имя</div>
                <div className="font-medium text-text-on-dark">{snapshot.customerName}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Telegram</div>
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
            Бронирование действительно 24 часа. Оплата при получении.
          </p>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
