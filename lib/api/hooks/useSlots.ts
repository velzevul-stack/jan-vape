'use client'

import useSWR from 'swr'
import type { TimeSlot } from '@/lib/mock-data'

interface SlotsResponse {
  date: string
  locationId: string
  timezone: string
  slots: TimeSlot[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface UseSlotsParams {
  locationId?: string
  customAddress?: string
  date?: string
  enabled?: boolean
}

export function useSlots({ locationId, customAddress, date, enabled = true }: UseSlotsParams) {
  const searchParams = new URLSearchParams()
  if (locationId) searchParams.set('locationId', locationId)
  if (customAddress) searchParams.set('customAddress', customAddress)
  if (date) searchParams.set('date', date)

  const shouldFetch = enabled && !!date && (!!locationId || !!customAddress)
  const url = shouldFetch ? `/api/slots?${searchParams.toString()}` : null

  const { data, error, isLoading, mutate } = useSWR<SlotsResponse>(url, fetcher, {
    refreshInterval: 8_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2_000,
  })

  return {
    slots: data?.slots ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
