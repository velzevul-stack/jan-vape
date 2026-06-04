'use client'

import { MapPin } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { UNAVAILABLE_DELIVERY_PLACE_MESSAGE } from '@/src/lib/unavailableDeliveryPlaces'

interface UnavailableDeliveryPlaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnavailableDeliveryPlaceDialog({
  open,
  onOpenChange,
}: UnavailableDeliveryPlaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-3xl border-0 bg-elevated p-0 shadow-2xl shadow-black/60 sm:max-w-sm"
      >
        <div className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-text-on-dark">
            Доставка в этот пункт невозможна
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-4 space-y-3">
              <p className="flex items-start gap-2.5 text-sm leading-snug text-text-on-dark">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" />
                <span>{UNAVAILABLE_DELIVERY_PLACE_MESSAGE}</span>
              </p>
            </div>
          </DialogDescription>
        </div>

        <div className="border-t border-border-on-dark px-4 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-full bg-accent-primary text-sm font-medium text-text-on-accent transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            OK
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
