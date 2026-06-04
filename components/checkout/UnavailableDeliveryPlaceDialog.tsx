'use client'

import { AlertCircle } from 'lucide-react'
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
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-danger/10">
            <AlertCircle className="h-7 w-7 text-status-danger" />
          </div>
          <DialogTitle className="text-lg font-semibold text-text-on-dark">
            Доставка недоступна
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-relaxed text-text-muted">
            {UNAVAILABLE_DELIVERY_PLACE_MESSAGE}
          </DialogDescription>
        </div>
        <div className="border-t border-border-on-dark px-4 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-full bg-accent-primary text-sm font-medium text-text-on-accent transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Понятно
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
