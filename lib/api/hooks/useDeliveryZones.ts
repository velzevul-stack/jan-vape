'use client'

import useSWR from 'swr'

export interface DeliveryZoneOption {
  id: string
  code: string
  name: string
  roundTripMinutes: number
  deliveryFee: number
}

interface DeliveryZonesResponse {
  zones: DeliveryZoneOption[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useDeliveryZones() {
  const { data, error, isLoading } = useSWR<DeliveryZonesResponse>(
    '/api/delivery-zones',
    fetcher,
    { revalidateOnFocus: false },
  )

  return {
    zones: data?.zones ?? [],
    isLoading,
    error,
  }
}

export interface DeliveryResolveResult {
  zoneId: string
  zoneName: string
  deliveryFee: number
  roundTripMinutes: number
  addressDetail: string
  displayAddress: string
  confidence: 'exact' | 'fuzzy' | 'none'
  candidates: Array<{ zoneId: string; zoneName: string; score: number }>
}

export async function resolveDeliveryAddress(text: string): Promise<DeliveryResolveResult> {
  const res = await fetch('/api/delivery/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    throw new Error('Failed to resolve delivery address')
  }
  return res.json()
}
