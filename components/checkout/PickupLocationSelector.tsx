'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MapPin, Search, ChevronRight, X, Truck } from 'lucide-react'
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
import { buildAddressWithZone, correctSettlementInAddress } from '@/lib/deliveryAddressText'
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
    addressDraft.trim().length > 0 ? 'delivery' : 'list',
  )
  const [zonePanelOpen, setZonePanelOpen] = useState(true)
  const [zoneFilter, setZoneFilter] = useState('')
  const [recentMatches, setRecentMatches] = useState<string[]>([])
  const [showRecent, setShowRecent] = useState(false)
  const [ambiguousResolve, setAmbiguousResolve] = useState<DeliveryResolveResult | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const suggestRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredZones = useMemo(() => {
    const needle = zoneFilter.trim().toLowerCase()
    if (!needle) return zones
    return zones.filter((zone) => zone.name.toLowerCase().includes(needle))
  }, [zones, zoneFilter])

  const applyZoneHint = useCallback(
    (zone: DeliveryZoneOption, addressText: string) => {
      setDeliveryZoneHint(zoneToSelection(zone))
      setAddressDraft(addressText.trim())
      setAmbiguousResolve(null)
      setResolveError(null)
      setShowRecent(false)
    },
    [setAddressDraft, setDeliveryZoneHint],
  )

  const autoResolve = useCallback(
    async (text: string) => {
      const corrected = correctSettlementInAddress(text, zones)
      if (corrected !== text) {
        setAddressDraft(corrected)
      }
      const trimmed = corrected.trim()
      if (trimmed.length < 2) {
        setDeliveryZoneHint(null)
        setAmbiguousResolve(null)
        setResolveError(null)
        return
      }
      setIsResolving(true)
      setResolveError(null)
      try {
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
        applyZoneHint(zone, trimmed)
      } catch {
        setResolveError(null)
      } finally {
        setIsResolving(false)
      }
    },
    [applyZoneHint, setDeliveryZoneHint, zones],
  )

  const handleQueryChange = useCallback(
    (value: string) => {
      setAddressDraft(value)
      setAmbiguousResolve(null)
      setResolveError(null)
      if (suggestRef.current) clearTimeout(suggestRef.current)
      if (resolveRef.current) clearTimeout(resolveRef.current)
      suggestRef.current = setTimeout(() => {
        const matches = filterRecentAddresses(value)
        setRecentMatches(matches)
        setShowRecent(matches.length > 0)
      }, 150)
      const delay = /,\s*$/.test(value) ? 120 : 450
      resolveRef.current = setTimeout(() => {
        void autoResolve(value)
      }, delay)
    },
    [autoResolve, setAddressDraft],
  )

  const handleAddressBlur = useCallback(() => {
    setTimeout(() => setShowRecent(false), 150)
    if (!addressDraft.trim()) return
    const corrected = correctSettlementInAddress(addressDraft, zones)
    if (corrected !== addressDraft) {
      setAddressDraft(corrected)
      void autoResolve(corrected)
    }
  }, [addressDraft, autoResolve, setAddressDraft, zones])

  const pickZone = useCallback(
    (zone: DeliveryZoneOption) => {
      const next = buildAddressWithZone(addressDraft, zone, zones)
      applyZoneHint(zone, next)
      setMode('delivery')
    },
    [addressDraft, applyZoneHint, zones],
  )

  const pickRecentAddress = useCallback(
    (label: string) => {
      setAddressDraft(label)
      setShowRecent(false)
      void autoResolve(label)
    },
    [autoResolve, setAddressDraft],
  )

  const switchToDelivery = useCallback(() => {
    setMode('delivery')
    setZonePanelOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

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
    if (collapseToken <= 0) return
    setZonePanelOpen(false)
  }, [collapseToken])

  useEffect(() => {
    return () => {
      if (suggestRef.current) clearTimeout(suggestRef.current)
      if (resolveRef.current) clearTimeout(resolveRef.current)
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
            <div className="pointer-events-none absolute inset-y-0 left-3 hidden items-center sm:flex">
              <Truck className="h-4 w-4 text-text-muted" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Например: Милейки, ул. Центральная 12"
              value={addressDraft}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') clearDeliveryInput()
              }}
              onFocus={() => {
                setZonePanelOpen(true)
                const matches = filterRecentAddresses(addressDraft)
                setRecentMatches(matches)
                setShowRecent(matches.length > 0)
              }}
              onBlur={handleAddressBlur}
              autoComplete="street-address"
              className="h-14 w-full rounded-2xl border border-border-on-dark bg-card-inner py-3 pl-4 pr-10 text-base text-text-on-dark caret-accent-primary placeholder:text-text-faint focus:border-accent-primary/50 focus:outline-none sm:pl-10"
            />
            <button
              type="button"
              onClick={clearDeliveryInput}
              className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-text-on-dark"
              aria-label="Очистить адрес"
            >
              <X className="h-4 w-4" />
            </button>
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

          {zonePanelOpen && (
            <div className="rounded-2xl border border-border-on-dark bg-card-inner p-3">
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  type="text"
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  placeholder="Населённый пункт..."
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
                      deliveryZoneHint?.id === zone.id && 'bg-elevated ring-1 ring-accent-primary/30',
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
                      onClick={() => applyZoneHint(zone, buildAddressWithZone(addressDraft, zone, zones))}
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
              Зона: {deliveryZoneHint.name}
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
