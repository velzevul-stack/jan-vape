'use client'

import useSWR from 'swr'
import type { Product } from '@/lib/mock-data'

interface CatalogParams {
  category?: string
  taste?: string
  strength?: string
  q?: string
  locationId?: string
}

interface CatalogResponse {
  products: Product[]
  strengthValues?: string[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useCatalog(params: CatalogParams = {}) {
  const searchParams = new URLSearchParams()
  if (params.category) searchParams.set('category', params.category)
  if (params.taste) searchParams.set('taste', params.taste)
  if (params.strength) searchParams.set('strength', params.strength)
  if (params.q) searchParams.set('q', params.q)
  if (params.locationId) searchParams.set('locationId', params.locationId)

  const query = searchParams.toString()
  const url = `/api/catalog${query ? `?${query}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<CatalogResponse>(url, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 15_000,
    dedupingInterval: 4_000,
  })

  return {
    products: data?.products ?? [],
    strengthValues: data?.strengthValues ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
