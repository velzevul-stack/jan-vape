'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface DeliveryZoneSelection {
  id: string
  name: string
  deliveryFee: number
  roundTripMinutes: number
}

interface BookingState {
  pickupLocationId: string | null
  addressDraft: string
  deliveryZoneHint: DeliveryZoneSelection | null
  customAddressText: string | null
  deliveryZone: DeliveryZoneSelection | null
  pickupDate: string | null
  pickupTime: string | null
  customerName: string
  customerTelegram: string
  comment: string
}

interface BookingContextType extends BookingState {
  setPickupLocation: (locationId: string) => void
  setAddressDraft: (text: string) => void
  setDeliveryZoneHint: (zone: DeliveryZoneSelection | null) => void
  confirmDeliveryAddress: (text: string, zone: DeliveryZoneSelection) => void
  clearDeliveryConfirmation: () => void
  clearLocation: () => void
  setPickupDate: (date: string | null) => void
  setPickupTime: (time: string | null) => void
  setCustomerName: (name: string) => void
  setCustomerTelegram: (telegram: string) => void
  setComment: (comment: string) => void
  resetBooking: () => void
  isPickupSelected: boolean
  isDeliverySelected: boolean
  isDeliveryDraft: boolean
  isLocationSelected: boolean
  canProceedToCheckout: boolean
  isSlotSelected: boolean
  deliveryFee: number
  zoneForSlots: DeliveryZoneSelection | null
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

const BOOKING_STORAGE_KEY = 'vapestore-booking'

const initialState: BookingState = {
  pickupLocationId: null,
  addressDraft: '',
  deliveryZoneHint: null,
  customAddressText: null,
  deliveryZone: null,
  pickupDate: null,
  pickupTime: null,
  customerName: '',
  customerTelegram: '',
  comment: '',
}

function migrateStoredBooking(parsed: Record<string, unknown>): Partial<BookingState> {
  const migrated: Partial<BookingState> = { ...parsed } as Partial<BookingState>
  if (!migrated.customerTelegram && typeof parsed.customerPhone === 'string') {
    migrated.customerTelegram = parsed.customerPhone
  }
  if (typeof migrated.addressDraft !== 'string') {
    migrated.addressDraft =
      typeof parsed.customAddressText === 'string' ? parsed.customAddressText : ''
  }
  if (parsed.deliveryZoneId && parsed.deliveryZoneName) {
    const zone: DeliveryZoneSelection = {
      id: String(parsed.deliveryZoneId),
      name: String(parsed.deliveryZoneName),
      deliveryFee: Number(parsed.deliveryFee ?? 0),
      roundTripMinutes: Number(parsed.roundTripMinutes ?? 0),
    }
    if (!migrated.deliveryZone) {
      migrated.deliveryZone = zone
    }
    if (!migrated.deliveryZoneHint) {
      migrated.deliveryZoneHint = zone
    }
  }
  return migrated
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(BOOKING_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, unknown>
        setState((prev) => ({ ...prev, ...migrateStoredBooking(parsed) }))
      } catch {
        localStorage.removeItem(BOOKING_STORAGE_KEY)
      }
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(
        BOOKING_STORAGE_KEY,
        JSON.stringify({
          ...state,
          deliveryZoneId: state.deliveryZone?.id ?? state.deliveryZoneHint?.id ?? null,
          deliveryZoneName: state.deliveryZone?.name ?? state.deliveryZoneHint?.name ?? null,
          deliveryFee: state.deliveryZone?.deliveryFee ?? state.deliveryZoneHint?.deliveryFee ?? 0,
          roundTripMinutes:
            state.deliveryZone?.roundTripMinutes ?? state.deliveryZoneHint?.roundTripMinutes ?? null,
        }),
      )
    }
  }, [state, isHydrated])

  const setPickupLocation = useCallback((locationId: string) => {
    setState((prev) => {
      if (
        prev.pickupLocationId === locationId &&
        !prev.addressDraft &&
        !prev.deliveryZone &&
        !prev.deliveryZoneHint
      ) {
        return prev
      }
      return {
        ...prev,
        pickupLocationId: locationId,
        addressDraft: '',
        deliveryZoneHint: null,
        customAddressText: null,
        deliveryZone: null,
        pickupTime: null,
      }
    })
  }, [])

  const setAddressDraft = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      pickupLocationId: null,
      addressDraft: text,
      customAddressText: null,
      deliveryZone: null,
      pickupTime: null,
    }))
  }, [])

  const setDeliveryZoneHint = useCallback((zone: DeliveryZoneSelection | null) => {
    setState((prev) => ({
      ...prev,
      deliveryZoneHint: zone,
    }))
  }, [])

  const confirmDeliveryAddress = useCallback((text: string, zone: DeliveryZoneSelection) => {
    const trimmed = text.trim()
    setState((prev) => ({
      ...prev,
      pickupLocationId: null,
      addressDraft: trimmed,
      customAddressText: trimmed || null,
      deliveryZone: zone,
      deliveryZoneHint: zone,
    }))
  }, [])

  const clearDeliveryConfirmation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      customAddressText: null,
      deliveryZone: null,
    }))
  }, [])

  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pickupLocationId: null,
      addressDraft: '',
      deliveryZoneHint: null,
      customAddressText: null,
      deliveryZone: null,
      pickupTime: null,
    }))
  }, [])

  const setPickupDate = useCallback((date: string | null) => {
    setState((prev) => ({
      ...prev,
      pickupDate: date,
      pickupTime: null,
    }))
  }, [])

  const setPickupTime = useCallback((time: string | null) => {
    setState((prev) => ({ ...prev, pickupTime: time }))
  }, [])

  const setCustomerName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, customerName: name }))
  }, [])

  const setCustomerTelegram = useCallback((telegram: string) => {
    setState((prev) => ({ ...prev, customerTelegram: telegram }))
  }, [])

  const setComment = useCallback((comment: string) => {
    setState((prev) => ({ ...prev, comment }))
  }, [])

  const resetBooking = useCallback(() => {
    setState(initialState)
    localStorage.removeItem(BOOKING_STORAGE_KEY)
  }, [])

  const isPickupSelected = state.pickupLocationId !== null
  const isDeliveryDraft = state.addressDraft.trim().length >= 3
  const isDeliverySelected =
    state.customAddressText !== null && state.deliveryZone !== null
  const isLocationSelected = isPickupSelected || isDeliveryDraft
  const canProceedToCheckout = isLocationSelected
  const isSlotSelected = state.pickupDate !== null && state.pickupTime !== null
  const deliveryFee = state.deliveryZone?.deliveryFee ?? state.deliveryZoneHint?.deliveryFee ?? 0
  const zoneForSlots = state.deliveryZone ?? state.deliveryZoneHint

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setPickupLocation,
        setAddressDraft,
        setDeliveryZoneHint,
        confirmDeliveryAddress,
        clearDeliveryConfirmation,
        clearLocation,
        setPickupDate,
        setPickupTime,
        setCustomerName,
        setCustomerTelegram,
        setComment,
        resetBooking,
        isPickupSelected,
        isDeliverySelected,
        isDeliveryDraft,
        isLocationSelected,
        canProceedToCheckout,
        isSlotSelected,
        deliveryFee,
        zoneForSlots,
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}

export type { DeliveryZoneSelection }
