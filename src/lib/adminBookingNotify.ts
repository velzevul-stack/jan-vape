import type { WebBookingStatus } from '@/src/entities/WebBooking'
import { enqueueNotification } from './notifier'

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}

const RESOLVED_FROM_PENDING: WebBookingStatus[] = ['confirmed', 'cancelled', 'completed']

export async function notifyAdminBookingPendingResolved(
  booking: { id: string; publicNumber: string },
  previousStatus: WebBookingStatus,
  newStatus: WebBookingStatus,
  source: 'app',
): Promise<void> {
  if (previousStatus !== 'pending') return
  if (!RESOLVED_FROM_PENDING.includes(newStatus)) return

  const adminBase = process.env.NOTIFY_ADMIN_BOT_URL
  if (!adminBase) return

  const endpoint = joinEndpoint(adminBase, '/events/booking-status-changed')
  const payload = {
    type: 'booking_status_changed',
    bookingId: booking.id,
    publicNumber: booking.publicNumber,
    previousStatus,
    newStatus,
    source,
  }

  try {
    await enqueueNotification(endpoint, payload)
  } catch (err) {
    console.error('[adminBookingNotify] enqueue failed', err)
  }
}
