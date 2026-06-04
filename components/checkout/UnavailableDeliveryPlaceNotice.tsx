'use client'

import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UNAVAILABLE_DELIVERY_PLACE_MESSAGE } from '@/src/lib/unavailableDeliveryPlaces'

export function UnavailableDeliveryPlaceNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-status-danger/45 bg-status-danger/10 p-5 text-center',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-6 w-6 text-status-danger" />
      <p className="text-sm font-semibold leading-snug text-status-danger">
        {UNAVAILABLE_DELIVERY_PLACE_MESSAGE}
      </p>
    </div>
  )
}
