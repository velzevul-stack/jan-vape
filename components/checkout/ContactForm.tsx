'use client'

import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { useBooking } from '@/lib/context/booking-context'

export function ContactForm() {
  const {
    customerName,
    customerTelegram,
    comment,
    setCustomerName,
    setCustomerTelegram,
    setComment,
  } = useBooking()

  const handleTelegramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (!raw) {
      setCustomerTelegram('')
      return
    }
    const withoutSpaces = raw.replace(/\s/g, '')
    if (withoutSpaces.startsWith('@')) {
      setCustomerTelegram(withoutSpaces)
    } else if (withoutSpaces.length > 0) {
      setCustomerTelegram(`@${withoutSpaces.replace(/^@+/, '')}`)
    }
  }

  const handleTelegramBlur = () => {
    if (customerTelegram) {
      setCustomerTelegram(normalizeTelegramUsername(customerTelegram))
    }
  }

  return (
    <div className="w-full">
      <h3 className="mb-4 font-display text-sm font-bold tracking-wider text-text-muted">
        КОНТАКТНЫЕ ДАННЫЕ
      </h3>

      <div className="space-y-4 rounded-3xl bg-card p-6">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-text-on-card">
            Имя <span className="text-status-warning">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Как к вам обращаться"
            className={cn(
              'h-14 w-full rounded-2xl bg-card-inner px-4 text-text-on-dark',
              'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary'
            )}
          />
        </div>

        <div>
          <label htmlFor="telegram" className="mb-2 block text-sm font-medium text-text-on-card">
            Telegram <span className="text-status-warning">*</span>
          </label>
          <div className="relative">
            <Send className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <input
              id="telegram"
              type="text"
              inputMode="text"
              autoComplete="username"
              value={customerTelegram}
              onChange={handleTelegramChange}
              onBlur={handleTelegramBlur}
              placeholder="@username"
              className={cn(
                'h-14 w-full rounded-2xl bg-card-inner pl-12 pr-4 text-text-on-dark',
                'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary'
              )}
            />
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            Укажите ник в Telegram — напишем о готовности заказа
          </p>
        </div>

        <div>
          <label htmlFor="comment" className="mb-2 block text-sm font-medium text-text-on-card">
            Комментарий <span className="text-text-muted">(необязательно)</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Дополнительная информация для продавца"
            rows={3}
            className={cn(
              'w-full resize-none rounded-2xl bg-card-inner px-4 py-3 text-text-on-dark',
              'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary'
            )}
          />
        </div>
      </div>
    </div>
  )
}
