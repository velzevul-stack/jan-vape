import { revalidatePath } from 'next/cache'
import { In } from 'typeorm'
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

export interface RescheduleWebBookingInput {
  scheduledAt: Date
  pickupLocationId?: string
  customAddressText?: string
  notifyCustomer?: boolean
}

export async function rescheduleWebBooking(
  booking: WebBooking,
  input: RescheduleWebBookingInput,
): Promise<WebBooking> {
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    throw new Error(`Cannot reschedule a ${booking.status} booking`)
  }

  const ds = await getDataSource()
  let locationId: string | null = booking.locationId
  let customAddressId: string | null = booking.customAddressId
  let locationLabel: string | null = null
  let customAddressLabel: string | null = null

  await ds.transaction(async (txn) => {
    const locationRepo = txn.getRepository(entityTableNames.PickupLocation)
    const addressRepo = txn.getRepository(entityTableNames.CustomAddress)
    const bookingRepo = txn.getRepository(entityTableNames.WebBooking)

    if (input.pickupLocationId) {
      const loc = await locationRepo.findOne({ where: { id: input.pickupLocationId } })
      if (!loc || !loc.isActive) {
        throw new Error('Location not found')
      }
      locationId = loc.id
      customAddressId = null
      locationLabel = loc.name
    } else if (input.customAddressText) {
      const key = normalizeAddress(input.customAddressText)
      let addr = await addressRepo.findOne({ where: { normalizedKey: key } })
      if (!addr) {
        addr = addressRepo.create({
          normalizedKey: key,
          label: input.customAddressText.trim(),
          salesCount: 0,
          isPromoted: false,
        })
        await addressRepo.save(addr)
      }
      locationId = null
      customAddressId = addr.id
      customAddressLabel = addr.label
    } else {
      const current = await bookingRepo.findOne({
        where: { id: booking.id },
        relations: { location: true, customAddress: true },
      })
      locationLabel = current?.location?.name ?? null
      customAddressLabel = current?.customAddress?.label ?? null
    }

    await bookingRepo.update(booking.id, {
      scheduledAt: input.scheduledAt,
      locationId,
      customAddressId,
    })
  })

  booking.scheduledAt = input.scheduledAt
  booking.locationId = locationId
  booking.customAddressId = customAddressId

  const notifyCustomer = input.notifyCustomer ?? true
  const userbotBase = process.env.NOTIFY_USERBOT_URL
  if (userbotBase && notifyCustomer) {
    const productRepo = await getRepo('ProductSnapshot')
    const productIds = Array.from(new Set(booking.items.map((item) => item.productId)))
    const products =
      productIds.length > 0
        ? await productRepo.find({ where: { id: In(productIds) } })
        : []
    const productMap = new Map(products.map((p) => [p.id, p]))

    const endpoint = joinEndpoint(userbotBase, '/events/booking-rescheduled')
    const payload = {
      type: 'booking_rescheduled',
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
      customerTelegram: booking.customerTelegram,
      scheduledAt: booking.scheduledAt.toISOString(),
      locationLabel: locationLabel ?? customAddressLabel,
      items: booking.items.map((item) => {
        const product = productMap.get(item.productId)
        return {
          flavor: product?.flavor ?? '',
          brand: product?.brand ?? '',
          quantity: item.quantity,
          price: item.retailPriceSnapshot,
        }
      }),
      totalAmount: Number(booking.totalAmount),
    }
    try {
      await enqueueNotification(endpoint, payload)
    } catch (err) {
      console.error('[rescheduleWebBooking] userbot enqueue failed', err)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/')

  return booking
}
