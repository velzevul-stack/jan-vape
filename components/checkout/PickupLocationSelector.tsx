'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MapPin, Search, ChevronRight, X, Truck, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { usePickupLocations } from '@/lib/api/hooks/usePickupLocations'
import {
  resolveDeliveryAddress,
  useDeliveryZones,
  type DeliveryResolveResult,
  type DeliveryZoneOption,
} from '@/lib/api/hooks/useDeliveryZones'
import { filterRecentAddresses } from '@/lib/recentAddresses'
import {
  composeDeliveryAddress,
  ensureDeliveryAddressWithZone,
  extractAddressDetail,
  getDefaultDeliveryZone,
} from '@/lib/deliveryAddressText'
import type { PickupLocation } from '@/lib/mock-data'

type Mode = 'list' | 'delivery'

interface PickupLocationSelectorProps {
  variant?: 'cards' | 'compact'
  className?: string
  collapseToken?: number
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
  collapseToken = 0,
}: PickupLocationSelectorProps) {
  const {
    pickupLocationId,
    addressDraft,
    deliveryZoneHint,
    setPickupLocation,
    setAddressDraft,
    setDeliveryZoneHint,
  } = useBooking()
  const { locations, isLoading } = usePickupLocations()
  const { zones } = useDeliveryZones()

  const [mode, setMode] = useState<Mode>(() =>
    addressDraft.trim().length > 0 || deliveryZoneHint ? 'delivery' : 'list',
  )
  const [zonePanelOpen, setZonePanelOpen] = useState(() => !deliveryZoneHint)
  const [zoneFilter, setZoneFilter] = useState('')
  const [recentMatches, setRecentMatches] = useState<string[]>([])
  const [showRecent, setShowRecent] = useState(false)
  const [ambiguousResolve, setAmbiguousResolve] = useState<DeliveryResolveResult | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const suggestRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const migratedRef = useRef(false)

  const filteredZones = useMemo(() => {
    const needle = zoneFilter.trim().toLowerCase()
    if (!needle) return zones
    return zones.filter((zone) => zone.name.toLowerCase().includes(needle))
  }, [zones, zoneFilter])

  const applyZoneSelection = useCallback(
    (zone: DeliveryZoneOption, detail: string) => {
      setDeliveryZoneHint(zoneToSelection(zone))
      setAddressDraft(detail.trim())
      setAmbiguousResolve(null)
      setResolveError(null)
      setShowRecent(false)
      setZonePanelOpen(false)
    },
    [setAddressDraft, setDeliveryZoneHint],
  )

  const autoResolveLegacyAddress = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (trimmed.length < 2) {
        setDeliveryZoneHint(null)
        setAmbiguousResolve(null)
        setResolveError(null)
        return
      }
      setIsResolving(true)
      setResolveError(null)
      try {
        const ensured = ensureDeliveryAddressWithZone(trimmed, zones)
        if (ensured.zone) {
          applyZoneSelection(
            ensured.zone,
            extractAddressDetail(ensured.address, ensured.zone, zones),
          )
          return
        }
        const result = await resolveDeliveryAddress(trimmed)
        if (result.confidence === 'none' || !result.zoneId) {
          setDeliveryZoneHint(null)
          setAmbiguousResolve(null)
          return
        }
        const zone = zones.find((item) => item.id === result.zoneId)
        if (!zone) return
        if (result.confidence === 'fuzzy' && result.candidates.length > 1) {
          setAmbiguousResolve(result)
          setDeliveryZoneHint(zoneToSelection(zone))
          return
        }
        setAmbiguousResolve(null)
        applyZoneSelection(
          zone,
          extractAddressDetail(result.displayAddress || trimmed, zone, zones),
        )
      } catch {
        setResolveError(null)
      } finally {
        setIsResolving(false)
      }
    },
    [applyZoneSelection, setDeliveryZoneHint, zones],
  )

  const handleDetailChange = useCallback(
    (value: string) => {
      setAddressDraft(value)
      setAmbiguousResolve(null)
      setResolveError(null)
      if (suggestRef.current) clearTimeout(suggestRef.current)
      suggestRef.current = setTimeout(() => {
        const query = deliveryZoneHint
          ? composeDeliveryAddress(deliveryZoneHint.name, value)
          : value
        const matches = filterRecentAddresses(query)
        setRecentMatches(matches)
        setShowRecent(matches.length > 0)
      }, 150)
    },
    [deliveryZoneHint, setAddressDraft],
  )

  const pickZone = useCallback(
    (zone: DeliveryZoneOption) => {
      const detail = extractAddressDetail(addressDraft, zone, zones)
      applyZoneSelection(zone, detail)
      setMode('delivery')
      setTimeout(() => inputRef.current?.focus(), 50)
    },
    [addressDraft, applyZoneSelection, zones],
  )

  const pickRecentAddress = useCallback(
    (label: string) => {
      setShowRecent(false)
      const ensured = ensureDeliveryAddressWithZone(label, zones)
      if (ensured.zone) {
        applyZoneSelection(
          ensured.zone,
          extractAddressDetail(ensured.address, ensured.zone, zones),
        )
        return
      }
      void autoResolveLegacyAddress(label)
    },
    [applyZoneSelection, autoResolveLegacyAddress, zones],
  )

  const switchToDelivery = useCallback(() => {
    setMode('delivery')
    if (!deliveryZoneHint && zones.length > 0) {
      const defaultZone = getDefaultDeliveryZone(zones)
      if (defaultZone) {
        const detail = addressDraft.trim()
          ? extractAddressDetail(addressDraft, defaultZone, zones)
          : ''
        applyZoneSelection(defaultZone, detail)
        setTimeout(() => inputRef.current?.focus(), 50)
        return
      }
    }
    setZonePanelOpen(!deliveryZoneHint)
    setTimeout(() => {
      if (deliveryZoneHint) {
        inputRef.current?.focus()
      }
    }, 50)
  }, [addressDraft, applyZoneSelection, deliveryZoneHint, zones])

  const clearDeliveryInput = useCallback(() => {
    setAddressDraft('')
    setDeliveryZoneHint(null)
    setZoneFilter('')
    setRecentMatches([])
    setShowRecent(false)
    setAmbiguousResolve(null)
    setResolveError(null)
    setZonePanelOpen(true)
    setMode('list')
  }, [setAddressDraft, setDeliveryZoneHint])

  useEffect(() => {
    if (migratedRef.current || zones.length === 0) return
    const trimmed = addressDraft.trim()
    if (!trimmed && !deliveryZoneHint) return

    migratedRef.current = true

    if (deliveryZoneHint) {
      const zone =
        zones.find((item) => item.id === deliveryZoneHint.id) ??
        zones.find((item) => item.name === deliveryZoneHint.name)
      if (zone && trimmed.includes(',')) {
        const detail = extractAddressDetail(trimmed, zone, zones)
        if (detail !== trimmed) {
          setAddressDraft(detail)
        }
      }
      setZonePanelOpen(false)
      return
    }

    const ensured = ensureDeliveryAddressWithZone(trimmed, zones)
    if (ensured.zone) {
      applyZoneSelection(
        ensured.zone,
        extractAddressDetail(ensured.address, ensured.zone, zones),
      )
    }
  }, [
    addressDraft,
    applyZoneSelection,
    deliveryZoneHint,
    setAddressDraft,
    zones,
  ])

  useEffect(() => {
    if (zones.length === 0 || mode !== 'delivery' || deliveryZoneHint) return
    const defaultZone = getDefaultDeliveryZone(zones)
    if (!defaultZone) return
    const detail = addressDraft.trim()
      ? extractAddressDetail(addressDraft, defaultZone, zones)
      : ''
    applyZoneSelection(defaultZone, detail)
  }, [addressDraft, applyZoneSelection, deliveryZoneHint, mode, zones])

  useEffect(() => {
    if (collapseToken <= 0) return
    setZonePanelOpen(false)
  }, [collapseToken])

  useEffect(() => {
    return () => {
      if (suggestRef.current) clearTimeout(suggestRef.current)
    }
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
            onClick={() => {
              setPickupLocation(loc.id)
              setMode('list')
            }}
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

          <button
            type="button"
            onClick={switchToDelivery}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent-primary/35 bg-accent-primary/5 p-5 text-center transition-all hover:border-accent-primary/55 hover:bg-accent-primary/10"
          >
            <span className="flex items-center gap-2 text-base font-semibold text-text-on-dark">
              <Truck className="h-5 w-5 text-accent-primary" />
              Доставка по адресу
            </span>
            <span className="text-sm text-text-muted">Укажите населённый пункт и адрес</span>
            <ChevronRight className="h-5 w-5 text-accent-primary" />
          </button>
        </>
      ) : (
        <div className="space-y-3">
          {deliveryZoneHint && !zonePanelOpen ? (
            <div className="rounded-2xl border border-border-on-dark bg-card-inner px-5 py-5 text-center">
              <p className="text-xs font-medium tracking-[0.18em] text-text-muted">НАСЕЛЁННЫЙ ПУНКТ</p>
              <p className="mt-2 font-display text-xl font-bold tracking-wide text-text-on-dark">
                {deliveryZoneHint.name}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {deliveryZoneHint.deliveryFee > 0
                  ? formatPrice(deliveryZoneHint.deliveryFee)
                  : 'бесплатно'}
              </p>
              <button
                type="button"
                onClick={() => setZonePanelOpen(true)}
                className="mx-auto mt-5 flex w-full max-w-xs items-center justify-center gap-2 rounded-full border border-accent-primary/35 bg-gradient-to-b from-elevated to-card-inner px-6 py-3.5 text-sm font-semibold text-text-on-dark shadow-md shadow-black/20 transition-all hover:border-accent-primary/55 hover:shadow-accent-primary/10 active:scale-[0.98]"
              >
                <MapPin className="h-4 w-4 shrink-0 text-accent-primary" />
                Выбрать населённый пункт
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border-on-dark bg-card-inner p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-wide text-text-muted">
                  НАСЕЛЁННЫЙ ПУНКТ
                </p>
                {deliveryZoneHint && (
                  <button
                    type="button"
                    onClick={() => setZonePanelOpen(false)}
                    className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-on-dark"
                  >
                    Свернуть
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  type="text"
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full bg-transparent text-sm text-text-on-dark placeholder:text-text-faint focus:outline-none"
                />
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {filteredZones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => pickZone(zone)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-elevated',
                      deliveryZoneHint?.id === zone.id && 'bg-elevated ring-1 ring-accent-primary/20',
                    )}
                  >
                    <span className="font-medium text-text-on-dark">{zone.name}</span>
                    <span className="text-xs text-text-muted">
                      {zone.deliveryFee > 0 ? formatPrice(zone.deliveryFee) : 'бесплатно'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border-2 border-accent-primary/25 bg-gradient-to-b from-accent-primary/5 to-card-inner p-4 shadow-lg shadow-accent-primary/5">
            <p className="mb-2 text-center text-base font-bold tracking-wide text-accent-soft sm:text-lg">
              АДРЕС ИЛИ МЕСТО ДОСТАВКИ
            </p>
            <p className="mb-3 text-center text-sm text-text-muted">
              Напишите адрес или название места — куда привезти заказ
            </p>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <Truck className="h-5 w-5 text-accent-primary" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  deliveryZoneHint
                    ? 'Адрес или место'
                    : 'Сначала выберите населённый пункт'
                }
                value={addressDraft}
                onChange={(e) => handleDetailChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') clearDeliveryInput()
                }}
                onFocus={() => {
                  const query = deliveryZoneHint
                    ? composeDeliveryAddress(deliveryZoneHint.name, addressDraft)
                    : addressDraft
                  const matches = filterRecentAddresses(query)
                  setRecentMatches(matches)
                  setShowRecent(matches.length > 0)
                }}
                onBlur={() => {
                  setTimeout(() => setShowRecent(false), 150)
                }}
                disabled={!deliveryZoneHint}
                autoComplete="street-address"
                className={cn(
                  'h-16 w-full rounded-2xl border-2 bg-elevated py-4 pl-12 pr-12 text-lg font-medium text-text-on-dark caret-accent-primary shadow-inner shadow-black/10 placeholder:text-base placeholder:font-normal placeholder:text-text-faint focus:border-accent-primary focus:outline-none focus:ring-4 focus:ring-accent-primary/15',
                  deliveryZoneHint
                    ? 'border-accent-primary/40'
                    : 'cursor-not-allowed border-border-on-dark opacity-60',
                )}
              />
              <button
                type="button"
                onClick={clearDeliveryInput}
                className="absolute inset-y-0 right-4 flex items-center text-text-muted hover:text-text-on-dark"
                aria-label="Очистить адрес"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isResolving && addressDraft.trim().length >= 2 && (
            <p className="text-xs text-text-muted">Определяем зону доставки…</p>
          )}

          {showRecent && recentMatches.length > 0 && (
            <ul className="animate-float-up overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-2xl shadow-black/40">
              {recentMatches.map((label) => (
                <li key={label} className="border-b border-border-on-dark last:border-b-0">
                  <button
                    type="button"
                    onMouseDown={() => pickRecentAddress(label)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-on-dark transition-colors hover:bg-card-inner"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {ambiguousResolve && ambiguousResolve.candidates.length > 1 && (
            <div className="rounded-2xl border border-accent-primary/30 bg-accent-primary/5 p-3">
              <p className="mb-2 text-xs text-text-muted">Уточните населённый пункт:</p>
              <div className="flex flex-wrap gap-2">
                {ambiguousResolve.candidates.map((candidate) => {
                  const zone = zones.find((item) => item.id === candidate.zoneId)
                  if (!zone) return null
                  return (
                    <button
                      key={candidate.zoneId}
                      type="button"
                      onClick={() =>
                        applyZoneSelection(
                          zone,
                          extractAddressDetail(addressDraft, zone, zones),
                        )
                      }
                      className="rounded-full bg-card-inner px-3 py-1.5 text-xs font-medium text-text-on-dark"
                    >
                      {candidate.zoneName}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {resolveError && (
            <div className="rounded-2xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
              {resolveError}
            </div>
          )}

          {deliveryZoneHint && addressDraft.trim().length >= 2 && (
            <p className="text-xs text-text-muted">
              Адрес: {composeDeliveryAddress(deliveryZoneHint.name, addressDraft)}
              {' · '}
              {deliveryZoneHint.deliveryFee > 0
                ? formatPrice(deliveryZoneHint.deliveryFee)
                : 'бесплатно'}
            </p>
          )}

          <button
            type="button"
            onClick={clearDeliveryInput}
            className="text-xs text-text-muted underline-offset-2 hover:underline"
          >
            ← Точки выдачи
          </button>
        </div>
      )}

      {pickupLocationId && mode === 'list' && (
        <p className="text-xs text-text-muted">Забрать на выбранной точке выдачи</p>
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
          : 'border-text-on-card/10 bg-card hover:border-accent-primary/40',
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
