import { revalidatePath } from 'next/cache'
import type { WebBooking } from '@/src/entities/WebBooking'
import { normalizeAddress } from './normalize'
import { entityTableNames, getDataSource, getRepo } from './db'
import { enqueueNotification } from './notifier'

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}

export interface UpdateWebBookingDeliveryAddressInput {
  customAddressText: string
  notifyCustomer?: boolean
}

export async function updateWebBookingDeliveryAddress(
  booking: WebBooking,
  input: UpdateWebBookingDeliveryAddressInput,
): Promise<WebBooking> {
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    throw new Error(`Cannot update address of a ${booking.status} booking`)
  }

  const isDelivery = booking.deliveryZoneId != null || booking.customAddressId != null
  if (!isDelivery) {
    throw new Error('Booking is not a delivery booking')
  }

  const newText = input.customAddressText.trim()
  if (newText.length < 2) {
    throw new Error('Address is too short')
  }

  const oldLabel = booking.customAddress?.label?.trim() ?? null
  const newKey = normalizeAddress(newText)
  const oldKey = oldLabel ? normalizeAddress(oldLabel) : null
  if (oldKey === newKey) {
    return booking
  }

  const ds = await getDataSource()
  let customAddressId: string | null = booking.customAddressId
  let customAddressLabel: string | null = null

  await ds.transaction(async (txn) => {
    const addressRepo = txn.getRepository(entityTableNames.CustomAddress)
    const bookingRepo = txn.getRepository(entityTableNames.WebBooking)

    let addr = await addressRepo.findOne({ where: { normalizedKey: newKey } })
    if (!addr) {
      addr = addressRepo.create({
        normalizedKey: newKey,
        label: newText,
        salesCount: 0,
        isPromoted: false,
      })
      await addressRepo.save(addr)
    } else if (addr.label !== newText) {
      addr.label = newText
      await addressRepo.save(addr)
    }

    customAddressId = addr.id
    customAddressLabel = addr.label
    await bookingRepo.update(booking.id, {
      customAddressId: addr.id,
      locationId: null,
    })
  })

  booking.customAddressId = customAddressId

  const notifyCustomer = input.notifyCustomer ?? true
  const userbotBase = process.env.NOTIFY_USERBOT_URL
  if (userbotBase && notifyCustomer && booking.customerTelegram) {
    const endpoint = joinEndpoint(userbotBase, '/events/booking-address-changed')
    const payload = {
      type: 'booking_address_changed',
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
      customerTelegram: booking.customerTelegram,
      oldAddressLabel: oldLabel,
      newAddressLabel: customAddressLabel ?? newText,
    }
    try {
      await enqueueNotification(endpoint, payload)
    } catch (err) {
      console.error('[updateWebBookingDeliveryAddress] userbot enqueue failed', err)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/')

  return booking
}
