'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, User, MessageSquare, Eraser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { fetchTgSession } from '@/lib/tgSessionClient'
import { useBooking } from '@/lib/context/booking-context'
import {
  readCustomerProfile,
  writeCustomerName,
  writeCustomerTelegram,
  clearCustomerProfile,
} from '@/lib/storage/customerProfile'

export function ContactForm() {
  const {
    customerName,
    customerTelegram,
    comment,
    setCustomerName,
    setCustomerTelegram,
    setComment,
  } = useBooking()

  const hydratedRef = useRef(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [telegramVerified, setTelegramVerified] = useState(false)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const stored = readCustomerProfile()
    if (!customerName && stored.name) setCustomerName(stored.name)
    if (!customerTelegram && stored.telegram) setCustomerTelegram(stored.telegram)
    setProfileLoaded(true)
  }, [customerName, customerTelegram, setCustomerName, setCustomerTelegram])

  useEffect(() => {
    let cancelled = false
    fetchTgSession()
      .then((info) => {
        if (cancelled || !info.verified || !info.customerTelegram) return
        setCustomerTelegram(info.customerTelegram)
        setTelegramVerified(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [setCustomerTelegram])

  useEffect(() => {
    if (!profileLoaded) return
    writeCustomerName(customerName.trim())
  }, [customerName, profileLoaded])

  useEffect(() => {
    if (!profileLoaded) return
    writeCustomerTelegram(customerTelegram.trim())
  }, [customerTelegram, profileLoaded])

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

  const handleClearProfile = () => {
    clearCustomerProfile()
    setCustomerName('')
    setCustomerTelegram('')
  }

  const hasStoredProfile = customerName.trim().length > 0 || customerTelegram.trim().length > 0

  return (
    <div className="w-full">
      <h3 className="mb-4 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
        КОНТАКТНЫЕ ДАННЫЕ
      </h3>

      <div className="space-y-4 rounded-3xl border border-border-on-dark bg-elevated p-5">
        <Field
          id="name"
          label="Имя"
          required
          icon={<User className="h-5 w-5" />}
        >
          <input
            id="name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Как к вам обращаться"
            autoComplete="given-name"
            className={inputClasses}
          />
        </Field>

        <Field
          id="telegram"
          label="Telegram"
          required
          icon={<Send className="h-5 w-5" />}
          hint="Напишем сюда, когда подтвердим бронь"
        >
          <input
            id="telegram"
            type="text"
            inputMode="text"
            autoComplete="username"
            value={customerTelegram}
            onChange={handleTelegramChange}
            onBlur={handleTelegramBlur}
            placeholder="@username"
            readOnly={telegramVerified}
            className={cn(inputClasses, telegramVerified && 'opacity-80')}
          />
        </Field>

        {telegramVerified && (
          <p className="text-xs text-status-success">
            Telegram подтверждён — username подставлен автоматически
          </p>
        )}

        <div>
          <label
            htmlFor="comment"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-on-dark"
          >
            Комментарий
            <span className="text-xs text-text-faint">(необязательно)</span>
          </label>
          <div className="relative">
            <MessageSquare className="pointer-events-none absolute left-4 top-3.5 z-10 h-5 w-5 text-text-muted" />
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительная информация для продавца"
              rows={3}
              className={cn(
                'w-full resize-none rounded-2xl border border-transparent bg-card-inner px-4 pl-12 py-3 text-base text-text-on-dark caret-accent-primary',
                'placeholder:text-text-faint focus:border-accent-primary/50 focus:bg-card-deep focus:outline-none focus:ring-2 focus:ring-accent-mist',
                'transition-colors leading-relaxed',
              )}
            />
          </div>
        </div>

        {hasStoredProfile && (
          <button
            type="button"
            onClick={handleClearProfile}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted underline-offset-2 hover:text-accent-soft hover:underline"
          >
            <Eraser className="h-3.5 w-3.5" />
            Очистить данные
          </button>
        )}
      </div>
    </div>
  )
}

const inputClasses = cn(
  'h-14 w-full rounded-2xl border border-transparent bg-card-inner px-4 pl-12 text-base text-text-on-dark caret-accent-primary',
  'placeholder:text-text-faint focus:border-accent-primary/50 focus:bg-card-deep focus:outline-none focus:ring-2 focus:ring-accent-mist',
  'transition-colors',
)

function Field({
  id,
  label,
  required,
  icon,
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  icon?: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-on-dark"
      >
        {label}
        {required && <span className="text-status-warning">*</span>}
        {hint && !required && <span className="text-xs text-text-faint">{hint}</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        {children}
      </div>
      {required && hint && (
        <p className="mt-1.5 text-xs text-text-faint">{hint}</p>
      )}
    </div>
  )
}
