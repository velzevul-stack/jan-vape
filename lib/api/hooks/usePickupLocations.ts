'use client'

import useSWR from 'swr'
import type { PickupLocation, PromotedAddress } from '@/lib/mock-data'

interface PickupLocationsResponse {
  locations: PickupLocation[]
  promotedAddresses: PromotedAddress[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function usePickupLocations() {
  const { data, error, isLoading, mutate } = useSWR<PickupLocationsResponse>(
    '/api/pickup-locations',
    fetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    },
  )

  return {
    locations: data?.locations ?? [],
    promotedAddresses: data?.promotedAddresses ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export async function fetchAddressSuggestions(q: string): Promise<PromotedAddress[]> {
  if (q.length < 2) return []
  const res = await fetch(`/api/address-suggest?q=${encodeURIComponent(q)}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.suggestions ?? []
}
