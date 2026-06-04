import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeAddress } from '@/src/lib/normalize'
import { In } from 'typeorm'
import { entityTableNames, getDataSource } from '@/src/lib/db'
import { findBookingStockIssues } from '@/src/lib/availability'
import { enqueueNotification } from '@/src/lib/notifier'
import {
  getCustomerStatsForTelegram,
  trustLevelLabel,
} from '@/src/lib/customerStats'
import { ensureTelegramCustomer, isTelegramCustomerBlocked } from '@/src/lib/telegramCustomer'
import { tgSessionCookieName, telegramFromSession, verifyTgSession } from '@/src/lib/tgSession'
import { assertUnverifiedBookingAllowed, assertUnverifiedCartQuantity } from '@/src/lib/unverifiedLimits'
import { isTelegramVerified } from '@/src/lib/telegramVerification'
import { normalizeTelegramUsername } from '@/lib/telegram'
import { buildZoneMinutesMap, isDeliverySlotAvailable } from '@/src/lib/deliverySlotGuard'
import { isUnavailableDeliveryPlace } from '@/src/lib/unavailableDeliveryPlaces'
import {
  mapBookingProductLines,
  withDeliveryInComposition,
} from '@/src/lib/bookingComposition'
import { resolveCustomerTelegramUserId } from '@/src/lib/customerTelegramUserId'
import {
  findBlockedSlotsForPickup,
  findGlobalBlockedSlots,
  isScheduledAtBlocked,
} from '@/src/lib/blockedSlots'
import { storeDayBounds } from '@/lib/dates'

const BookingSchema = z.object({
  pickupLocationId: z.string().uuid().optional(),
  customAddressText: z.string().min(2).max(500).optional(),
  deliveryZoneId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  customerName: z.string().min(2).max(255),
  customerTelegram: z.string().min(3).max(255),
  comment: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        retailPriceSnapshot: z.number().min(0),
      }),
    )
    .min(1),
}).refine(
  (d) => d.pickupLocationId || (d.customAddressText && d.deliveryZoneId),
  'Either pickupLocationId or delivery address with zone is required',
).refine(
  (d) => !d.pickupLocationId || !d.deliveryZoneId,
  'Use either pickup location or delivery zone',
)

function generatePublicNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `B-${datePart}-${rand}`
}

interface SavedBookingResult {
  bookingId: string
  publicNumber: string
  scheduledAt: string
  customerName: string
  customerTelegram: string
  comment: string | null
  totalAmount: number
  locationLabel: string | null
  customAddressLabel: string | null
  deliveryZoneName: string | null
  deliveryFee: number
  itemsSnapshot: Array<{
    productId: string
    quantity: number
    retailPriceSnapshot: number
  }>
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data
  const scheduledAt = new Date(data.scheduledAt)
  const tgSession = verifyTgSession(req.cookies.get(tgSessionCookieName())?.value)
  let customerTelegram = normalizeTelegramUsername(data.customerTelegram)
  if (tgSession) {
    customerTelegram = telegramFromSession(tgSession)
  }

  if (await isTelegramCustomerBlocked(customerTelegram)) {
    return NextResponse.json({ error: 'Booking is not available for this account' }, { status: 403 })
  }

  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0)
  const verified = await isTelegramVerified(customerTelegram, req)
  const cartCheck = assertUnverifiedCartQuantity(totalQuantity, verified)
  if (!cartCheck.ok) {
    return NextResponse.json({ error: cartCheck.message, code: 'unverified_cart_limit' }, { status: 422 })
  }

  const bookingCheck = await assertUnverifiedBookingAllowed(customerTelegram, req)
  if (!bookingCheck.ok) {
    return NextResponse.json({ error: bookingCheck.message, code: 'unverified_booking_limit' }, { status: 422 })
  }

  const ds = await getDataSource()

  let saved: SavedBookingResult | null = null
  let errorResponse: NextResponse | null = null

  await ds.transaction(async (txn) => {
    const locationRepo = txn.getRepository(entityTableNames.PickupLocation)
    const addressRepo = txn.getRepository(entityTableNames.CustomAddress)
    const zoneRepo = txn.getRepository(entityTableNames.DeliveryZone)
    const bookingRepo = txn.getRepository(entityTableNames.WebBooking)

    let locationId: string | null = null
    let customAddressId: string | null = null
    let deliveryZoneId: string | null = null
    let deliveryFee = 0
    let roundTripMinutes: number | null = null
    let locationLabel: string | null = null
    let customAddressLabel: string | null = null
    let deliveryZoneName: string | null = null

    const blockedRepo = txn.getRepository(entityTableNames.BlockedSlot)

    if (data.pickupLocationId) {
      const loc = await locationRepo.findOne({ where: { id: data.pickupLocationId } })
      if (!loc || !loc.isActive) {
        errorResponse = NextResponse.json({ error: 'Location not found' }, { status: 404 })
        return
      }
      locationId = loc.id
      locationLabel = loc.name

      const day = scheduledAt.toISOString().slice(0, 10)
      const { start: dayStart, end: dayEnd } = storeDayBounds(day)
      const blockedSlots = await findBlockedSlotsForPickup(
        blockedRepo,
        dayStart,
        dayEnd,
        loc.id,
      )
      if (isScheduledAtBlocked(scheduledAt, blockedSlots, loc.slotStepMinutes || 5)) {
        errorResponse = NextResponse.json(
          { error: 'Time slot is blocked', code: 'slot_blocked' },
          { status: 409 },
        )
        return
      }

      const step = loc.slotStepMinutes || 5
      const slotEnd = new Date(scheduledAt.getTime() + step * 60 * 1000)
      const existingAtSlot = await bookingRepo
        .createQueryBuilder('wb')
        .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
        .andWhere('wb.locationId = :locationId', { locationId: loc.id })
        .andWhere('wb.scheduledAt >= :start AND wb.scheduledAt < :end', {
          start: scheduledAt.toISOString(),
          end: slotEnd.toISOString(),
        })
        .getCount()
      if (existingAtSlot >= (loc.maxBookingsPerSlot ?? 1)) {
        errorResponse = NextResponse.json(
          { error: 'Time slot is fully booked', code: 'slot_busy' },
          { status: 409 },
        )
        return
      }
    } else if (data.customAddressText && data.deliveryZoneId) {
      const zone = await zoneRepo.findOne({ where: { id: data.deliveryZoneId, isActive: true } })
      if (!zone) {
        errorResponse = NextResponse.json({ error: 'Delivery zone not found' }, { status: 404 })
        return
      }
      deliveryZoneId = zone.id
      deliveryZoneName = zone.name
      deliveryFee = Number(zone.deliveryFee)
      roundTripMinutes = zone.roundTripMinutes

      if (isUnavailableDeliveryPlace(data.customAddressText, zone.name)) {
        errorResponse = NextResponse.json(
          { error: 'Delivery to this address is not available', code: 'delivery_place_unavailable' },
          { status: 409 },
        )
        return
      }

      const key = normalizeAddress(data.customAddressText)
      let addr = await addressRepo.findOne({ where: { normalizedKey: key } })
      if (!addr) {
        addr = addressRepo.create({
          normalizedKey: key,
          label: data.customAddressText.trim(),
          salesCount: 0,
          isPromoted: false,
        })
        await addressRepo.save(addr)
      }
      customAddressId = addr.id
      customAddressLabel = addr.label

      const day = scheduledAt.toISOString().slice(0, 10)
      const { start: dayStart, end: dayEnd } = storeDayBounds(day)
      const blockedSlots = await findGlobalBlockedSlots(blockedRepo, dayStart, dayEnd)
      if (isScheduledAtBlocked(scheduledAt, blockedSlots)) {
        errorResponse = NextResponse.json(
          { error: 'Time slot is blocked', code: 'slot_blocked' },
          { status: 409 },
        )
        return
      }

      const zones = await zoneRepo.find({ where: { isActive: true } })
      const zoneMinutesById = buildZoneMinutesMap(zones)

      const existingDeliveries = await bookingRepo
        .createQueryBuilder('wb')
        .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
        .andWhere('wb.scheduledAt BETWEEN :start AND :end', {
          start: dayStart.toISOString(),
          end: dayEnd.toISOString(),
        })
        .andWhere('wb.deliveryZoneId IS NOT NULL')
        .getMany()

      const available = isDeliverySlotAvailable(
        scheduledAt,
        roundTripMinutes as number,
        existingDeliveries,
        zoneMinutesById,
      )
      if (!available) {
        errorResponse = NextResponse.json(
          { error: 'Delivery time is not available', code: 'delivery_slot_busy' },
          { status: 409 },
        )
        return
      }
    }

    const stockIssues = await findBookingStockIssues(
      data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      txn,
    )
    if (stockIssues.length > 0) {
      errorResponse = NextResponse.json(
        { error: 'Insufficient stock', issues: stockIssues },
        { status: 409 },
      )
      return
    }

    const itemsTotal = data.items.reduce(
      (sum, item) => sum + item.retailPriceSnapshot * item.quantity,
      0,
    )
    const totalAmount = itemsTotal + deliveryFee

    let customerTelegramUserId: string | null = null
    if (tgSession?.id) {
      customerTelegramUserId = tgSession.id
    } else {
      customerTelegramUserId = await resolveCustomerTelegramUserId(customerTelegram)
    }

    const booking = bookingRepo.create({
      publicNumber: generatePublicNumber(),
      source: 'web',
      customerName: data.customerName,
      customerTelegram,
      customerTelegramUserId,
      comment: data.comment ?? null,
      scheduledAt,
      locationId,
      customAddressId,
      deliveryZoneId,
      deliveryFee,
      roundTripMinutes,
      items: data.items,
      totalAmount,
      status: 'pending',
    })

    await bookingRepo.save(booking)
    const customer = await ensureTelegramCustomer(booking.customerTelegram)
    if (tgSession) {
      const customerRepo = txn.getRepository(entityTableNames.TelegramCustomer)
      await customerRepo.update(customer.id, {
        verifiedAt: customer.verifiedAt ?? new Date(),
        telegramId: tgSession.id ?? customer.telegramId,
      })
    }

    saved = {
      bookingId: booking.id,
      publicNumber: booking.publicNumber,
      scheduledAt: booking.scheduledAt.toISOString(),
      customerName: booking.customerName,
      customerTelegram: booking.customerTelegram,
      comment: booking.comment,
      totalAmount,
      locationLabel,
      customAddressLabel,
      deliveryZoneName,
      deliveryFee,
      itemsSnapshot: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        retailPriceSnapshot: item.retailPriceSnapshot,
      })),
    }
  })

  if (errorResponse) return errorResponse
  if (!saved) {
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 })
  }

  const savedBooking = saved as SavedBookingResult

  const productRepo = (await getDataSource()).getRepository(entityTableNames.ProductSnapshot)
  const productIds = Array.from(new Set(savedBooking.itemsSnapshot.map((i) => i.productId)))
  const products =
    productIds.length > 0 ? await productRepo.find({ where: { id: In(productIds) } }) : []
  const productMap = new Map(products.map((p) => [p.id, p]))

  const adminEventsBase = process.env.NOTIFY_ADMIN_BOT_URL
  if (adminEventsBase) {
    const customerStats = await getCustomerStatsForTelegram(savedBooking.customerTelegram)
    const endpoint = joinEndpoint(adminEventsBase, '/events/booking-created')
    const payload = {
      type: 'booking_created',
      bookingId: savedBooking.bookingId,
      publicNumber: savedBooking.publicNumber,
      customerName: savedBooking.customerName,
      customerTelegram: savedBooking.customerTelegram,
      customerTrustLevel: customerStats.trustLevel,
      customerTrustLabel: trustLevelLabel(customerStats.trustLevel),
      customerWarnings: customerStats.warnings,
      scheduledAt: savedBooking.scheduledAt,
      location: savedBooking.locationLabel,
      customAddress: savedBooking.customAddressLabel,
      deliveryZone: savedBooking.deliveryZoneName,
      deliveryFee: savedBooking.deliveryFee,
      items: withDeliveryInComposition(
        mapBookingProductLines(savedBooking.itemsSnapshot, productMap),
        savedBooking.deliveryFee,
        savedBooking.deliveryZoneName,
      ),
      totalAmount: savedBooking.totalAmount,
      comment: savedBooking.comment,
    }
    try {
      await enqueueNotification(endpoint, payload)
    } catch (err) {
      console.error('[bookings] failed to enqueue admin-bot notification', err)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/')

  return NextResponse.json(
    {
      publicNumber: savedBooking.publicNumber,
      bookingId: savedBooking.bookingId,
      scheduledAt: savedBooking.scheduledAt,
    },
    { status: 201 },
  )
}

function joinEndpoint(base: string, path: string): string {
  if (!base) return path
  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/events') && path.startsWith('/events')) {
    return trimmed + path.slice('/events'.length)
  }
  return trimmed + path
}
