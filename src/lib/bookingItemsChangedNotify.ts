import { revalidatePath } from 'next/cache'
import { In } from 'typeorm'
import type { WebBooking } from '../entities/WebBooking'
import { getRepo } from './db'
import { enqueueNotification } from './notifier'
import { enrichUserbotPayload } from './customerTelegramUserId'
import { productDisplayName } from './productDisplayName'

type BookingItemLine = {
  productId: string
  quantity: number
  retailPriceSnapshot: number
}

export type BookingItemDiffLine = {
  action: 'added' | 'removed' | 'qty_changed'
  displayName: string
  fromQty?: number
  toQty?: number
}

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}

function itemKey(line: BookingItemLine): string {
  return line.productId
}

function normalizeQtyMap(items: BookingItemLine[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const line of items) {
    const key = itemKey(line)
    map.set(key, (map.get(key) ?? 0) + line.quantity)
  }
  return map
}

export function computeBookingItemsDiff(
  previous: Array<{ key: string; displayName: string; quantity: number }>,
  next: Array<{ key: string; displayName: string; quantity: number }>,
): BookingItemDiffLine[] {
  const prevMap = new Map(previous.map((p) => [p.key, p]))
  const nextMap = new Map(next.map((n) => [n.key, n]))
  const diff: BookingItemDiffLine[] = []

  for (const [key, n] of nextMap) {
    const p = prevMap.get(key)
    if (!p) {
      diff.push({ action: 'added', displayName: n.displayName, toQty: n.quantity })
    } else if (p.quantity !== n.quantity) {
      diff.push({
        action: 'qty_changed',
        displayName: n.displayName,
        fromQty: p.quantity,
        toQty: n.quantity,
      })
    }
  }

  for (const [key, p] of prevMap) {
    if (!nextMap.has(key)) {
      diff.push({ action: 'removed', displayName: p.displayName, fromQty: p.quantity })
    }
  }

  return diff
}

function shouldNotifyCustomer(booking: WebBooking): boolean {
  const tg = booking.customerTelegram?.trim() ?? ''
  if (!tg || tg === '@app') return false
  if (booking.source !== 'web') return false
  if (booking.status === 'cancelled' || booking.status === 'completed') return false
  return true
}

export async function notifyBookingItemsChangedIfNeeded(params: {
  booking: WebBooking
  previousItems: BookingItemLine[]
  nextItems: BookingItemLine[]
  displayNameByExternalId: Map<number, string>
  notifyCustomer: boolean
}): Promise<void> {
  const { booking, previousItems, nextItems, displayNameByExternalId, notifyCustomer } = params
  if (!notifyCustomer || !shouldNotifyCustomer(booking)) return

  const prevQty = normalizeQtyMap(previousItems)
  const nextQty = normalizeQtyMap(nextItems)
  const keys = new Set([...prevQty.keys(), ...nextQty.keys()])
  let changed = false
  for (const key of keys) {
    if ((prevQty.get(key) ?? 0) !== (nextQty.get(key) ?? 0)) {
      changed = true
      break
    }
  }
  if (!changed) return

  const productRepo = await getRepo('ProductSnapshot')
  const productIds = Array.from(new Set([...previousItems, ...nextItems].map((i) => i.productId)))
  const snapshots = productIds.length
    ? await productRepo.find({ where: { id: In(productIds) } })
    : []
  const snapshotById = new Map(snapshots.map((s) => [s.id, s]))

  const resolveName = (line: BookingItemLine): string => {
    const snap = snapshotById.get(line.productId)
    if (!snap) return 'товар'
    const fromPayload = displayNameByExternalId.get(snap.externalId)
    if (fromPayload && fromPayload.trim()) return fromPayload.trim()
    return productDisplayName(snap)
  }

  const toLines = (items: BookingItemLine[]) => {
    const qtyMap = normalizeQtyMap(items)
    return Array.from(qtyMap.entries()).map(([key, quantity]) => {
      const sample = items.find((i) => itemKey(i) === key)!
      return { key, displayName: resolveName(sample), quantity }
    })
  }

  const diff = computeBookingItemsDiff(toLines(previousItems), toLines(nextItems))
  if (diff.length === 0) return

  const newLines = toLines(nextItems)
  const userbotBase = process.env.NOTIFY_USERBOT_URL
  if (!userbotBase) return

  const endpoint = joinEndpoint(userbotBase, '/events/booking-items-changed')
  const payload = await enrichUserbotPayload(
    {
      type: 'booking_items_changed',
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
      customerTelegram: booking.customerTelegram,
      diff,
      newItems: newLines.map((l) => ({
        displayName: l.displayName,
        quantity: l.quantity,
      })),
    },
    booking,
  )

  try {
    await enqueueNotification(endpoint, payload)
  } catch (err) {
    console.error('[bookingItemsChangedNotify] userbot enqueue failed', err)
  }

  revalidatePath('/admin/bookings')
}
