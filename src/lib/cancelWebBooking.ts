import { revalidatePath } from 'next/cache'
import type { WebBooking } from '@/src/entities/WebBooking'
import { getRepo } from './db'
import { enqueueNotification } from './notifier'
import { enrichUserbotPayload } from './customerTelegramUserId'
import { enqueueAppAlert } from './appAlerts'
import { resolveCancelledFromStatus } from './customerStats'

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}

export async function cancelWebBooking(
  booking: WebBooking,
  reason: string | null,
  options?: {
    lastMessage?: string | null
    cancelledBy?: 'customer' | 'admin'
    notifyCustomer?: boolean
  },
): Promise<WebBooking> {
  const repo = await getRepo('WebBooking')

  const wasCancelled = booking.status === 'cancelled'

  if (!wasCancelled) {
    const cancelledFromStatus = resolveCancelledFromStatus(booking.status)
    await repo.update(booking.id, { status: 'cancelled', cancelledFromStatus })
    booking.status = 'cancelled'
    booking.cancelledFromStatus = cancelledFromStatus
  }

  const cancelledBy = options?.cancelledBy ?? 'admin'
  const notifyCustomer = options?.notifyCustomer ?? true
  const customerReason =
    reason ??
    (cancelledBy === 'admin'
      ? 'Отменено менеджером'
      : cancelledBy === 'customer'
        ? 'Отменено клиентом в Telegram'
        : null)
  const userbotBase = process.env.NOTIFY_USERBOT_URL
  if (userbotBase && notifyCustomer && !wasCancelled) {
    const endpoint = joinEndpoint(userbotBase, '/events/booking-cancelled')
    const payload = await enrichUserbotPayload(
      {
        type: 'booking_cancelled',
        bookingId: booking.id,
        publicNumber: booking.publicNumber,
        customerTelegram: booking.customerTelegram,
        reason: customerReason,
      },
      booking,
    )
    try {
      await enqueueNotification(endpoint, payload)
    } catch (err) {
      console.error('[cancelWebBooking] userbot enqueue failed', err)
    }
  }

  if (!wasCancelled) {
    const alertType =
      cancelledBy === 'customer' ? 'booking_cancelled_by_customer' : 'booking_cancelled'
    await enqueueAppAlert(alertType, {
      bookingId: booking.id,
      appReservationId: booking.appReservationId,
      publicNumber: booking.publicNumber,
      customerTelegram: booking.customerTelegram,
      customerName: booking.customerName,
      lastMessage: options?.lastMessage ?? null,
      reason: customerReason,
      cancelledBy,
    })
  }

  if (cancelledBy === 'customer') {
    const adminBase = process.env.NOTIFY_ADMIN_BOT_URL
    if (adminBase) {
      const endpoint = joinEndpoint(adminBase, '/events/customer-cancelled')
      const payload = {
        type: 'customer_cancelled',
        bookingId: booking.id,
        publicNumber: booking.publicNumber,
        customerTelegram: booking.customerTelegram,
        customerName: booking.customerName,
        lastMessage: options?.lastMessage ?? null,
        reason,
      }
      try {
        await enqueueNotification(endpoint, payload)
      } catch (err) {
        console.error('[cancelWebBooking] admin enqueue failed', err)
      }
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/')

  return booking
}
