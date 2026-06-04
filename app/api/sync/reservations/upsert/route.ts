import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { In } from 'typeorm'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { entityTableNames, getDataSource, getRepo } from '@/src/lib/db'
import { normalizeAddress } from '@/src/lib/normalize'
import { findDeliveryZoneByName } from '@/src/lib/deliveryZoneResolve'
import type { WebBookingStatus } from '@/src/entities/WebBooking'
import { notifyBookingItemsChangedIfNeeded } from '@/src/lib/bookingItemsChangedNotify'
import { notifyBookingRescheduled } from '@/src/lib/rescheduleWebBooking'
import { buildZoneMinutesMap, isDeliverySlotAvailable } from '@/src/lib/deliverySlotGuard'
import { isUnavailableDeliveryPlace } from '@/src/lib/unavailableDeliveryPlaces'
import { storeDayBounds } from '@/lib/dates'

const ReservationItemSchema = z.object({
  externalId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  retailPrice: z.number().min(0),
  displayName: z.string().max(500).nullish(),
})

const ReservationSchema = z.object({
  appReservationId: z.number().int().positive(),
  webBookingId: z.string().uuid().nullish(),
  customerName: z.string().min(1).max(255),
  scheduledAt: z.string().datetime().nullish(),
  expirationDate: z.number().int().nullish(),
  place: z.string().max(500).nullish(),
  deliveryZoneName: z.string().max(255).nullish(),
  deliveryAddressDetail: z.string().max(500).nullish(),
  items: z.array(ReservationItemSchema).min(1),
  status: z.enum(['pending', 'confirmed', 'cancelled']).nullish(),
  notifyCustomer: z.boolean().nullish(),
})

const BodySchema = z.object({
  reservations: z.array(ReservationSchema).min(1),
})

function generatePublicNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `B-${datePart}-${rand}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof BodySchema.safeParse>
    try {
      parsed = BodySchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const ds = await getDataSource()
    let upserted = 0

    for (const reservation of parsed.data.reservations) {
      const productRepo = await getRepo('ProductSnapshot')
      const externalIds = reservation.items.map((item) => item.externalId)
      const snapshots = await productRepo.find({ where: { externalId: In(externalIds) } })
      const snapshotByExternalId = new Map(snapshots.map((p) => [p.externalId, p]))

      const mappedItems: Array<{
        productId: string
        quantity: number
        retailPriceSnapshot: number
      }> = []
      for (const item of reservation.items) {
        const snapshot = snapshotByExternalId.get(item.externalId)
        if (!snapshot) continue
        mappedItems.push({
          productId: snapshot.id,
          quantity: item.quantity,
          retailPriceSnapshot: item.retailPrice,
        })
      }
      if (mappedItems.length === 0) continue

      const totalAmount = mappedItems.reduce(
        (sum, item) => sum + item.retailPriceSnapshot * item.quantity,
        0,
      )

      const scheduledAt = reservation.scheduledAt
        ? new Date(reservation.scheduledAt)
        : reservation.expirationDate
          ? new Date(reservation.expirationDate)
          : new Date()

      const status = (reservation.status ?? 'pending') as WebBookingStatus
      const notifyCustomer = reservation.notifyCustomer ?? true
      const displayNameByExternalId = new Map<number, string>()
      for (const item of reservation.items) {
        if (item.displayName?.trim()) {
          displayNameByExternalId.set(item.externalId, item.displayName.trim())
        }
      }

      let previousItems: Array<{
        productId: string
        quantity: number
        retailPriceSnapshot: number
      }> = []
      let existingBookingId: string | null = null
      let previousScheduledAt: Date | null = null

      await ds.transaction(async (txn) => {
        const bookingRepo = txn.getRepository(entityTableNames.WebBooking)
        const zoneRepo = txn.getRepository(entityTableNames.DeliveryZone)
        const addressRepo = txn.getRepository(entityTableNames.CustomAddress)
        const locationRepo = txn.getRepository(entityTableNames.PickupLocation)

        const existingByWebId = reservation.webBookingId
          ? await bookingRepo.findOne({ where: { id: reservation.webBookingId } })
          : null
        const existing =
          existingByWebId ??
          (await bookingRepo.findOne({
            where: { appReservationId: reservation.appReservationId },
          }))

        let locationId: string | null = existing?.locationId ?? null
        let customAddressId: string | null = existing?.customAddressId ?? null
        let deliveryZoneId: string | null = existing?.deliveryZoneId ?? null
        let deliveryFee = existing ? Number(existing.deliveryFee) : 0
        let roundTripMinutes: number | null = existing?.roundTripMinutes ?? null

        const zones = await zoneRepo.find({ where: { isActive: true } })

        const applyDeliveryZone = async (
          zone: (typeof zones)[number],
          addressDetail: string | null,
        ) => {
          deliveryZoneId = zone.id
          deliveryFee = Number(zone.deliveryFee)
          roundTripMinutes = zone.roundTripMinutes
          const detail = addressDetail?.trim() ?? ''
          const addressText = detail ? `${zone.name}, ${detail}` : zone.name
          if (isUnavailableDeliveryPlace(addressText, zone.name, reservation.place)) {
            throw new Error('delivery_place_unavailable')
          }
          const key = normalizeAddress(addressText)
          let addr = await addressRepo.findOne({ where: { normalizedKey: key } })
          if (!addr) {
            addr = addressRepo.create({
              normalizedKey: key,
              label: addressText,
              salesCount: 0,
              isPromoted: false,
            })
            await addressRepo.save(addr)
          }
          customAddressId = addr.id
          locationId = null
        }

        if (reservation.deliveryZoneName) {
          const zone = findDeliveryZoneByName(zones, reservation.deliveryZoneName.trim())
          if (zone) {
            await applyDeliveryZone(zone, reservation.deliveryAddressDetail ?? null)
          }
        } else if (reservation.place) {
          const placeName = reservation.place.trim()
          const zone = findDeliveryZoneByName(zones, placeName)
          if (zone) {
            await applyDeliveryZone(zone, null)
          } else {
            const locations = await locationRepo.find({ where: { isActive: true } })
            const loc = locations.find((l) => l.name.toLowerCase() === placeName.toLowerCase())
            if (loc) {
              locationId = loc.id
              customAddressId = null
              deliveryZoneId = null
              deliveryFee = 0
              roundTripMinutes = null
            }
          }
        }

        if (
          deliveryZoneId &&
          roundTripMinutes != null &&
          (status === 'pending' || status === 'confirmed')
        ) {
          const day = scheduledAt.toISOString().slice(0, 10)
          const { start: dayStart, end: dayEnd } = storeDayBounds(day)
          const zoneMinutesById = buildZoneMinutesMap(zones)
          const dayDeliveries = await bookingRepo
            .createQueryBuilder('wb')
            .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
            .andWhere('wb.scheduledAt BETWEEN :start AND :end', {
              start: dayStart.toISOString(),
              end: dayEnd.toISOString(),
            })
            .andWhere('wb.deliveryZoneId IS NOT NULL')
            .getMany()
          if (
            !isDeliverySlotAvailable(
              scheduledAt,
              roundTripMinutes,
              dayDeliveries,
              zoneMinutesById,
              existing?.id,
            )
          ) {
            throw new Error('delivery_slot_busy')
          }
        }

        const bookingTotal = totalAmount + deliveryFee

        if (existing) {
          previousItems = [...(existing.items ?? [])]
          existingBookingId = existing.id
          previousScheduledAt = existing.scheduledAt ? new Date(existing.scheduledAt) : null
          const updateData: Record<string, unknown> = {
            customerName: reservation.customerName.trim(),
            scheduledAt,
            items: mappedItems,
            totalAmount: bookingTotal,
            status,
            locationId,
            customAddressId,
            deliveryZoneId,
            deliveryFee,
            roundTripMinutes,
            syncedToAppAt: new Date(),
          }
          if (existing.appReservationId == null) {
            updateData.appReservationId = reservation.appReservationId
          }
          if (reservation.place != null) {
            updateData.comment = reservation.place
          }
          await bookingRepo.update(existing.id, updateData)
        } else {
          await bookingRepo.save(
            bookingRepo.create({
              publicNumber: generatePublicNumber(),
              source: 'app',
              customerName: reservation.customerName.trim(),
              customerTelegram: '@app',
              customerTelegramUserId: null,
              comment: reservation.place ?? null,
              scheduledAt,
              locationId,
              customAddressId,
              deliveryZoneId,
              deliveryFee,
              roundTripMinutes,
              items: mappedItems,
              totalAmount: bookingTotal,
              status,
              appReservationId: reservation.appReservationId,
              syncedToAppAt: new Date(),
            }),
          )
        }
      })

      if (existingBookingId) {
        try {
          const bookingRepo = await getRepo('WebBooking')
          const booking = await bookingRepo.findOne({
            where: { id: existingBookingId },
            relations: { location: true, customAddress: true },
          })
          if (booking) {
            await notifyBookingItemsChangedIfNeeded({
              booking,
              previousItems,
              nextItems: mappedItems,
              displayNameByExternalId,
              notifyCustomer,
            })

            const prevMs = previousScheduledAt?.getTime() ?? 0
            const nextMs = new Date(booking.scheduledAt).getTime()
            if (notifyCustomer && prevMs && nextMs && prevMs !== nextMs) {
              try {
                await notifyBookingRescheduled(booking)
              } catch (err) {
                console.error('[reservations/upsert] notify rescheduled failed', err)
              }
            }
          }
        } catch (err) {
          console.error('[reservations/upsert] notify items changed failed', err)
        }
      }

      upserted++
    }

    if (upserted > 0) {
      revalidatePath('/admin')
      revalidatePath('/admin/bookings')
    }

    return NextResponse.json({ upserted })
  })
}
