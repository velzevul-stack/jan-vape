'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MapPin, Check, Search, ChevronRight, X, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { usePickupLocations, fetchAddressSuggestions } from '@/lib/api/hooks/usePickupLocations'
import {
  resolveDeliveryAddress,
  useDeliveryZones,
  type DeliveryResolveResult,
  type DeliveryZoneOption,
} from '@/lib/api/hooks/useDeliveryZones'
import type { PickupLocation, PromotedAddress } from '@/lib/mock-data'

type Mode = 'list' | 'delivery'

interface PickupLocationSelectorProps {
  variant?: 'cards' | 'compact'
  className?: string
}

function zoneToSelection(zone: DeliveryZoneOption) {
  return {
    id: zone.id,
    name: zone.name,
    deliveryFee: zone.deliveryFee,
    roundTripMinutes: zone.roundTripMinutes,
  }
}

export function PickupLocationSelector({
  variant = 'cards',
  className,
}: PickupLocationSelectorProps) {
  const {
    pickupLocationId,
    customAddressText,
    deliveryZone,
    setPickupLocation,
    setDeliveryAddress,
  } = useBooking()
  const { locations, promotedAddresses, isLoading } = usePickupLocations()
  const { zones } = useDeliveryZones()

  const [mode, setMode] = useState<Mode>(() =>
    customAddressText != null ? 'delivery' : 'list',
  )
  const [query, setQuery] = useState(customAddressText ?? '')
  const [zoneFilter, setZoneFilter] = useState('')
  const [suggestions, setSuggestions] = useState<PromotedAddress[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [pendingResolve, setPendingResolve] = useState<DeliveryResolveResult | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredZones = useMemo(() => {
    const needle = zoneFilter.trim().toLowerCase()
    if (!needle) return zones
    return zones.filter((zone) => zone.name.toLowerCase().includes(needle))
  }, [zones, zoneFilter])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setPendingResolve(null)
    setResolveError(null)
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

  const applyResolvedDelivery = useCallback((result: DeliveryResolveResult) => {
    const zone = zones.find((item) => item.id === result.zoneId)
    if (!zone) return
    setDeliveryAddress(result.displayAddress, zoneToSelection(zone))
    setPendingResolve(null)
    setResolveError(null)
    setShowDropdown(false)
  }, [setDeliveryAddress, zones])

  const resolveAndConfirm = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setIsResolving(true)
    setResolveError(null)
    try {
      const result = await resolveDeliveryAddress(trimmed)
      if (result.confidence === 'none' || !result.zoneId) {
        setResolveError('Не удалось определить населённый пункт. Выберите из списка или уточните адрес.')
        setPendingResolve(null)
        return
      }
      if (result.confidence === 'fuzzy' || result.candidates.length > 1) {
        setPendingResolve(result)
        return
      }
      applyResolvedDelivery(result)
    } catch {
      setResolveError('Не удалось проверить адрес. Попробуйте ещё раз.')
    } finally {
      setIsResolving(false)
    }
  }, [applyResolvedDelivery])

  const pickZone = useCallback((zone: DeliveryZoneOption) => {
    const detail = query.trim()
    const display = detail && !detail.toLowerCase().includes(zone.name.toLowerCase())
      ? `${zone.name}, ${detail}`
      : zone.name
    setDeliveryAddress(display, zoneToSelection(zone))
    setPendingResolve(null)
    setResolveError(null)
    setMode('delivery')
  }, [query, setDeliveryAddress])

  const switchToDelivery = useCallback(() => {
    setMode('delivery')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const switchToList = useCallback(() => {
    setMode('list')
    setQuery('')
    setZoneFilter('')
    setSuggestions([])
    setShowDropdown(false)
    setPendingResolve(null)
    setResolveError(null)
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
                Часто используемые адреса
              </p>
              <div className="flex flex-wrap gap-2">
                {promotedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setQuery(addr.label)
                      void resolveAndConfirm(addr.label)
                    }}
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
            onClick={switchToDelivery}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-border-subtle/30 p-4 text-left text-text-muted transition-colors hover:border-accent-primary/40 hover:text-text-on-dark"
          >
            <span className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4" />
              Доставка по адресу...
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Truck className="h-4 w-4 text-accent-primary" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Например: Майск, ул. Центральная 12"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void resolveAndConfirm(query)
                if (e.key === 'Escape') switchToList()
              }}
              onBlur={() => {
                setTimeout(() => setShowDropdown(false), 150)
              }}
              autoComplete="street-address"
              className="h-14 w-full rounded-2xl border-2 border-accent-primary/40 bg-card-inner py-3 pl-10 pr-10 text-base text-text-on-dark caret-accent-primary placeholder:text-text-faint focus:border-accent-primary focus:bg-card-inner focus:outline-none"
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
            <ul className="animate-float-up overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-2xl shadow-black/40">
              {suggestions.map((s) => (
                <li key={s.id} className="border-b border-border-on-dark last:border-b-0">
                  <button
                    type="button"
                    onMouseDown={() => {
                      setQuery(s.label)
                      void resolveAndConfirm(s.label)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-on-dark transition-colors hover:bg-card-inner"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
                    <span className="truncate">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-2xl border border-border-on-dark bg-card-inner p-3">
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                placeholder="Найти населённый пункт..."
                className="w-full bg-transparent text-sm text-text-on-dark placeholder:text-text-faint focus:outline-none"
              />
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {filteredZones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => pickZone(zone)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-elevated"
                >
                  <span className="font-medium text-text-on-dark">{zone.name}</span>
                  <span className="text-xs text-text-muted">
                    {zone.deliveryFee > 0 ? formatPrice(zone.deliveryFee) : 'бесплатно'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {query.trim().length >= 2 && (
            <button
              type="button"
              disabled={isResolving}
              onClick={() => void resolveAndConfirm(query)}
              className="flex w-full items-center gap-2 rounded-2xl bg-accent-primary/10 px-4 py-3 text-sm text-accent-primary transition-colors hover:bg-accent-primary/20 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isResolving ? 'Проверяем адрес…' : `Проверить «${query.trim()}»`}
            </button>
          )}

          {resolveError && (
            <div className="rounded-2xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
              {resolveError}
            </div>
          )}

          {pendingResolve && (
            <div className="space-y-3 rounded-2xl border border-accent-primary/30 bg-accent-primary/5 p-4">
              <p className="text-sm text-text-on-dark">
                Доставка: <span className="font-semibold">{pendingResolve.displayAddress}</span>
              </p>
              <p className="text-sm text-text-muted">
                {pendingResolve.deliveryFee > 0
                  ? `Стоимость доставки: ${formatPrice(pendingResolve.deliveryFee)}`
                  : 'Доставка бесплатная'}
              </p>
              {pendingResolve.candidates.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {pendingResolve.candidates.map((candidate) => {
                    const zone = zones.find((item) => item.id === candidate.zoneId)
                    if (!zone) return null
                    return (
                      <button
                        key={candidate.zoneId}
                        type="button"
                        onClick={() => {
                          applyResolvedDelivery({
                            ...pendingResolve,
                            zoneId: zone.id,
                            zoneName: zone.name,
                            deliveryFee: zone.deliveryFee,
                            roundTripMinutes: zone.roundTripMinutes,
                            displayAddress: pendingResolve.addressDetail
                              ? `${zone.name}, ${pendingResolve.addressDetail}`
                              : zone.name,
                            confidence: 'exact',
                          })
                        }}
                        className="rounded-full bg-card-inner px-3 py-1.5 text-xs font-medium text-text-on-dark"
                      >
                        {candidate.zoneName}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyResolvedDelivery(pendingResolve)}
                  className="flex-1 rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-text-on-accent"
                >
                  Продолжить
                </button>
                <button
                  type="button"
                  onClick={() => setPendingResolve(null)}
                  className="rounded-full bg-card-inner px-4 py-2 text-sm text-text-muted"
                >
                  Отменить
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={switchToList}
            className="text-xs text-text-muted underline-offset-2 hover:underline"
          >
            ← Самовывоз из магазина
          </button>
        </div>
      )}

      {deliveryZone && customAddressText && mode === 'list' && (
        <div className="space-y-1 rounded-xl bg-accent-primary/10 px-3 py-2 text-sm text-accent-primary">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" />
            <span className="flex-1 truncate">{customAddressText}</span>
            <Check className="h-3.5 w-3.5" />
          </div>
          <div className="pl-5 text-xs text-accent-primary/90">
            {deliveryZone.deliveryFee > 0
              ? `Доставка: ${formatPrice(deliveryZone.deliveryFee)}`
              : 'Доставка бесплатная'}
          </div>
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
