'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface BookingState {
  pickupLocationId: string | null
  customAddressText: string | null
  pickupDate: string | null
  pickupTime: string | null
  customerName: string
  customerTelegram: string
  comment: string
}

interface BookingContextType extends BookingState {
  setPickupLocation: (locationId: string) => void
  setCustomAddress: (text: string) => void
  clearLocation: () => void
  setPickupDate: (date: string | null) => void
  setPickupTime: (time: string | null) => void
  setCustomerName: (name: string) => void
  setCustomerTelegram: (telegram: string) => void
  setComment: (comment: string) => void
  resetBooking: () => void
  isPickupSelected: boolean
  isSlotSelected: boolean
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

const BOOKING_STORAGE_KEY = 'vapestore-booking'

const initialState: BookingState = {
  pickupLocationId: null,
  customAddressText: null,
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
      localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, isHydrated])

  const setPickupLocation = useCallback((locationId: string) => {
    setState((prev) => ({
      ...prev,
      pickupLocationId: locationId,
      customAddressText: null,
      pickupTime: null,
    }))
  }, [])

  const setCustomAddress = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      pickupLocationId: null,
      customAddressText: text || null,
      pickupTime: null,
    }))
  }, [])

  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pickupLocationId: null,
      customAddressText: null,
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

  const isPickupSelected = state.pickupLocationId !== null || state.customAddressText !== null
  const isSlotSelected = state.pickupDate !== null && state.pickupTime !== null

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setPickupLocation,
        setCustomAddress,
        clearLocation,
        setPickupDate,
        setPickupTime,
        setCustomerName,
        setCustomerTelegram,
        setComment,
        resetBooking,
        isPickupSelected,
        isSlotSelected,
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
