'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Check, Search, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBooking } from '@/lib/context/booking-context'
import { usePickupLocations, fetchAddressSuggestions } from '@/lib/api/hooks/usePickupLocations'
import type { PickupLocation, PromotedAddress } from '@/lib/mock-data'

type Mode = 'list' | 'custom'

interface PickupLocationSelectorProps {
  variant?: 'cards' | 'compact'
  className?: string
}

export function PickupLocationSelector({
  variant = 'cards',
  className,
}: PickupLocationSelectorProps) {
  const { pickupLocationId, customAddressText, setPickupLocation, setCustomAddress } = useBooking()
  const { locations, promotedAddresses, isLoading } = usePickupLocations()

  const [mode, setMode] = useState<Mode>(() =>
    customAddressText != null ? 'custom' : 'list',
  )
  const [query, setQuery] = useState(customAddressText ?? '')
  const [suggestions, setSuggestions] = useState<PromotedAddress[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 2) {
        const results = await fetchAddressSuggestions(value)
        setSuggestions(results)
        setShowDropdown(results.length > 0)
      } else {
        setSuggestions([])
        setShowDropdown(false)
      }
    }, 200)
  }, [])

  const commitCustomAddress = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed) {
      setCustomAddress(trimmed)
    }
    setShowDropdown(false)
  }, [setCustomAddress])

  const switchToCustom = useCallback(() => {
    setMode('custom')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const switchToList = useCallback(() => {
    setMode('list')
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
  }, [])

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-card" />
        ))}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {locations.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => { setPickupLocation(loc.id); setMode('list') }}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
              pickupLocationId === loc.id
                ? 'bg-accent-primary text-text-on-accent'
                : 'bg-elevated text-text-on-dark hover:bg-elevated/80',
            )}
          >
            {loc.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {mode === 'list' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {locations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                selected={pickupLocationId === loc.id}
                onSelect={() => setPickupLocation(loc.id)}
              />
            ))}
          </div>

          {promotedAddresses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Часто используемые
              </p>
              <div className="flex flex-wrap gap-2">
                {promotedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setCustomAddress(addr.label)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all',
                      customAddressText === addr.label
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border-subtle/20 bg-card text-text-muted hover:border-accent-primary/40',
                    )}
                  >
                    <MapPin className="h-3 w-3" />
                    {addr.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={switchToCustom}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-border-subtle/30 p-4 text-left text-text-muted transition-colors hover:border-accent-primary/40 hover:text-text-on-dark"
          >
            <span className="flex items-center gap-2 text-sm">
              <Search className="h-4 w-4" />
              Введите свой адрес...
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <MapPin className="h-4 w-4 text-accent-primary" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Введите адрес или место встречи"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCustomAddress(query)
                if (e.key === 'Escape') switchToList()
              }}
              onBlur={() => {
                setTimeout(() => setShowDropdown(false), 150)
              }}
              className="w-full rounded-2xl border-2 border-accent-primary/40 bg-card py-3 pl-10 pr-10 text-sm text-text-on-dark placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={switchToList}
              className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-text-on-dark"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {showDropdown && suggestions.length > 0 && (
            <ul className="rounded-2xl border border-border-subtle/20 bg-card shadow-xl">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      setQuery(s.label)
                      commitCustomAddress(s.label)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-on-dark hover:bg-elevated"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
                    <span>{s.label}</span>
                    <span className="ml-auto text-xs text-text-muted">{s.salesCount}×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => commitCustomAddress(query)}
              className="flex w-full items-center gap-2 rounded-2xl bg-accent-primary/10 px-4 py-3 text-sm text-accent-primary transition-colors hover:bg-accent-primary/20"
            >
              <Check className="h-4 w-4" />
              Использовать «{query.trim()}»
            </button>
          )}

          <button
            type="button"
            onClick={switchToList}
            className="text-xs text-text-muted underline-offset-2 hover:underline"
          >
            ← Выбрать из списка точек
          </button>
        </div>
      )}

      {(customAddressText && mode === 'list') && (
        <div className="flex items-center gap-2 rounded-xl bg-accent-primary/10 px-3 py-2 text-sm text-accent-primary">
          <MapPin className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">{customAddressText}</span>
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  )
}

function LocationCard({
  location,
  selected,
  onSelect,
}: {
  location: PickupLocation
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200',
        selected
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border-subtle/20 bg-card hover:border-accent-primary/40',
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            selected ? 'bg-accent-primary text-text-on-accent' : 'bg-elevated text-text-on-dark',
          )}
        >
          <MapPin className="h-5 w-5" />
        </div>
        {selected && <Check className="h-5 w-5 shrink-0 text-accent-primary" aria-hidden />}
      </div>
      <div>
        <div
          className={cn(
            'font-display text-base font-bold tracking-wide',
            selected ? 'text-accent-primary' : 'text-text-on-card',
          )}
        >
          {location.name}
        </div>
        <div className="mt-1 text-sm text-text-muted">{location.address}</div>
        <div className="mt-1 text-xs text-text-muted">
          {location.workDayStart} — {location.workDayEnd}
        </div>
      </div>
    </button>
  )
}
