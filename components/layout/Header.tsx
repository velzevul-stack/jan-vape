'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MapPin, ChevronDown, Check, ShoppingBag, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PickupLocation } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { usePickupLocations } from '@/lib/api/hooks/usePickupLocations'
import { useCart } from '@/lib/context/cart-context'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pickupLocationId, customAddressText, setPickupLocation } = useBooking()
  const { locations } = usePickupLocations()
  const { totalItems } = useCart()

  const selectedLocation = locations.find((loc) => loc.id === pickupLocationId)
  const displayLabel = selectedLocation?.name ?? customAddressText ?? null

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-border-on-dark bg-canvas/85 backdrop-blur-xl shadow-[0_8px_30px_-16px_rgba(0,0,0,0.6)]'
          : 'border-b border-transparent bg-canvas/60 backdrop-blur-md',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:h-20 md:px-6">
        <Link href="/" className="group flex min-w-0 shrink items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft via-accent-primary to-accent-ember text-text-on-accent shadow-lg shadow-accent-primary/30 md:h-10 md:w-10">
            <span className="font-display text-lg font-black leading-none">J</span>
            <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent-mint shadow-[0_0_10px] shadow-accent-mint/70">
              <span className="h-1.5 w-1.5 rounded-full bg-canvas" />
            </span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-extrabold tracking-[0.18em] text-text-on-dark transition-colors group-hover:text-accent-soft sm:text-xl">
              JAN-VAPE
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.32em] text-text-muted sm:block">
              Ивацевичи · 18+
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative max-w-[50vw] sm:max-w-none">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'group/loc flex max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200 sm:gap-2 sm:px-4',
                displayLabel
                  ? 'border-border-strong bg-elevated text-text-on-dark hover:border-accent-primary/50'
                  : 'border-accent-primary/60 bg-accent-mist text-accent-soft hover:bg-accent-primary/15 hover:text-accent-primary',
              )}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="hidden truncate text-sm sm:inline-block">
                {displayLabel ?? 'Выбрать точку'}
              </span>
              <span className="truncate text-sm sm:hidden">{displayLabel ?? 'Точка'}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-200',
                  isOpen && 'rotate-180',
                )}
              />
            </button>

            {isOpen && (
              <>
                <button
                  type="button"
                  aria-label="Закрыть"
                  className="fixed inset-0 z-10 cursor-default bg-canvas/40 backdrop-blur-sm"
                  onClick={() => setIsOpen(false)}
                />
                <div className="animate-float-up absolute right-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-text-on-card/10 bg-card p-2 shadow-2xl shadow-black/40">
                  <div className="mb-1 flex items-center justify-between px-3 py-2">
                    <h3 className="font-display text-[11px] font-bold tracking-[0.22em] text-text-faint">
                      ТОЧКИ ВЫДАЧИ
                    </h3>
                    <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
                  </div>
                  <div className="space-y-1">
                    {locations.map((location) => (
                      <LocationItem
                        key={location.id}
                        location={location}
                        selected={location.id === pickupLocationId}
                        onClick={() => {
                          setPickupLocation(location.id)
                          setIsOpen(false)
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href="/cart"
            className={cn(
              'relative flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-all duration-200 sm:h-11 sm:px-4',
              totalItems > 0
                ? 'border-accent-primary/40 bg-accent-mist text-accent-soft hover:bg-accent-primary/20'
                : 'border-border-strong bg-elevated text-text-on-dark hover:border-accent-primary/40',
            )}
            aria-label="Корзина"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Корзина</span>
            {totalItems > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-primary px-1.5 text-[11px] font-bold tabular-nums text-text-on-accent">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

function LocationItem({
  location,
  selected,
  onClick,
}: {
  location: PickupLocation
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150',
        selected
          ? 'bg-accent-primary text-text-on-accent shadow-md shadow-accent-primary/30'
          : 'text-text-on-card hover:bg-text-on-card/5',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold tabular-nums',
          selected
            ? 'bg-text-on-accent/15 text-text-on-accent'
            : 'bg-card-inner text-text-on-dark',
        )}
      >
        {location.code.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate font-medium', selected ? 'text-text-on-accent' : 'text-text-on-card')}>
          {location.name}
        </div>
        <div
          className={cn(
            'truncate text-sm',
            selected ? 'text-text-on-accent/70' : 'text-text-muted',
          )}
        >
          {location.address}
        </div>
        <div
          className={cn(
            'text-xs tabular-nums',
            selected ? 'text-text-on-accent/60' : 'text-text-faint',
          )}
        >
          {location.workDayStart} — {location.workDayEnd}
        </div>
      </div>
      {selected && <Check className="h-5 w-5 shrink-0" />}
    </button>
  )
}
