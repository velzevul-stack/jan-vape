'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import { useBooking } from '@/lib/context/booking-context'
import { useCart } from '@/lib/context/cart-context'
import { resolveDeliveryAddress, useDeliveryZones } from '@/lib/api/hooks/useDeliveryZones'
import {
  correctSettlementInAddress,
  resolveZoneFromAddressPrefix,
} from '@/lib/deliveryAddressText'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeliveryConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeliveryConfirmDialog({ open, onOpenChange }: DeliveryConfirmDialogProps) {
  const router = useRouter()
  const { totalPrice } = useCart()
  const { zones } = useDeliveryZones()
  const {
    addressDraft,
    deliveryZoneHint,
    confirmDeliveryAddress,
    setDeliveryZoneHint,
    setAddressDraft,
  } = useBooking()
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const correctedAddress = useMemo(
    () => correctSettlementInAddress(addressDraft, zones),
    [addressDraft, zones],
  )

  const previewZone = useMemo(() => {
    if (deliveryZoneHint) return deliveryZoneHint
    const matched = resolveZoneFromAddressPrefix(correctedAddress, zones)
    if (!matched) return null
    return {
      id: matched.id,
      name: matched.name,
      deliveryFee: matched.deliveryFee,
      roundTripMinutes: matched.roundTripMinutes,
    }
  }, [correctedAddress, deliveryZoneHint, zones])

  const fee = previewZone?.deliveryFee ?? 0
  const orderTotal = totalPrice + fee
  const wasCorrected = correctedAddress.trim() !== addressDraft.trim()

  const handleConfirm = async () => {
    const address = correctedAddress.trim()
    if (!address) return
    setIsConfirming(true)
    setError(null)
    try {
      let zone = previewZone
      if (!zone) {
        const result = await resolveDeliveryAddress(address)
        if (!result.zoneId) {
          setError('Не удалось определить зону доставки. Уточните адрес.')
          setIsConfirming(false)
          return
        }
        zone = {
          id: result.zoneId,
          name: result.zoneName,
          deliveryFee: result.deliveryFee,
          roundTripMinutes: result.roundTripMinutes,
        }
      }
      if (wasCorrected) {
        setAddressDraft(address)
      }
      setDeliveryZoneHint(zone)
      confirmDeliveryAddress(address, zone)
      onOpenChange(false)
      router.push('/checkout')
    } catch {
      setError('Не удалось проверить адрес. Попробуйте ещё раз.')
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-3xl border-0 bg-elevated p-0 shadow-2xl shadow-black/60 sm:max-w-sm"
      >
        <div className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-text-on-dark">
            Доставить на этот адрес?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-4 space-y-3">
              <p className="flex items-start gap-2.5 text-sm leading-snug text-text-on-dark">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                <span>{correctedAddress.trim()}</span>
              </p>
              {wasCorrected && (
                <p className="text-xs text-text-muted">
                  Населённый пункт исправлен автоматически
                </p>
              )}
              {previewZone && (
                <p className="text-sm text-text-muted">
                  {previewZone.name}
                  {' · '}
                  {fee > 0 ? formatPrice(fee) : 'бесплатно'}
                </p>
              )}
            </div>
          </DialogDescription>
        </div>

        <div className="mx-6 mb-5 flex items-center justify-between rounded-2xl bg-card-inner px-4 py-3">
          <span className="text-sm text-text-muted">Итого с доставкой</span>
          <span className="text-lg font-semibold tabular-nums text-accent-soft">
            {formatPrice(orderTotal)}
          </span>
        </div>

        {error && (
          <p className="mx-6 mb-4 rounded-xl bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2 border-t border-border-on-dark px-4 py-4">
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-full bg-card-inner text-sm font-medium text-text-on-dark transition-colors hover:bg-border-on-dark/40"
          >
            Нет
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => void handleConfirm()}
            className={cn(
              'h-11 flex-1 rounded-full bg-accent-primary text-sm font-medium text-text-on-accent transition-opacity',
              isConfirming && 'opacity-70',
            )}
          >
            {isConfirming ? 'Секунду…' : 'Да'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
