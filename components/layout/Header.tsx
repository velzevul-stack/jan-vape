'use client'

import { useState } from 'react'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PickupLocation } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { usePickupLocations } from '@/lib/api/hooks/usePickupLocations'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { pickupLocationId, customAddressText, setPickupLocation } = useBooking()
  const { locations } = usePickupLocations()

  const selectedLocation = locations.find(loc => loc.id === pickupLocationId)
  const displayLabel = selectedLocation?.name ?? customAddressText ?? null

  return (
    <header className="sticky top-0 z-50 border-b border-border-on-dark bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <a href="/" className="min-w-0 shrink">
          <span className="font-display text-lg font-bold tracking-wider text-text-on-dark sm:text-2xl">
            Jan-Vape
          </span>
          <span className="hidden text-xs text-text-muted sm:block">Ивацевичи</span>
        </a>

        {/* Location Selector */}
        <div className="relative max-w-[45vw] sm:max-w-none">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex max-w-full items-center gap-1.5 rounded-full px-3 py-2 transition-all duration-200 sm:gap-2 sm:px-4',
              displayLabel
                ? 'bg-elevated text-text-on-dark'
                : 'bg-accent-primary text-text-on-accent'
            )}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm font-medium">
              {displayLabel ?? 'Точка'}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl bg-card p-2 shadow-xl">
                <div className="mb-2 px-3 py-2">
                  <h3 className="font-display text-xs font-bold tracking-wider text-text-muted">
                    ТОЧКИ ВЫДАЧИ
                  </h3>
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
          ? 'bg-accent-primary text-text-on-accent'
          : 'text-text-on-card hover:bg-text-on-card/5'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold',
          selected
            ? 'bg-text-on-accent/20 text-text-on-accent'
            : 'bg-elevated text-text-on-dark'
        )}
      >
        {location.code.slice(0, 2)}
      </div>
      <div className="flex-1">
        <div className={cn('font-medium', selected ? 'text-text-on-accent' : 'text-text-on-card')}>
          {location.name}
        </div>
        <div className={cn('text-sm', selected ? 'text-text-on-accent/70' : 'text-text-muted')}>
          {location.address}
        </div>
        <div className={cn('text-xs', selected ? 'text-text-on-accent/60' : 'text-text-muted')}>
          {location.workDayStart} — {location.workDayEnd}
        </div>
      </div>
      {selected && <Check className="h-5 w-5" />}
    </button>
  )
}
