import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { In } from 'typeorm'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { entityTableNames, getDataSource, getRepo } from '@/src/lib/db'
import { normalizeAddress } from '@/src/lib/normalize'
import type { WebBookingStatus } from '@/src/entities/WebBooking'

const ReservationItemSchema = z.object({
  externalId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  retailPrice: z.number().min(0),
})

const ReservationSchema = z.object({
  appReservationId: z.number().int().positive(),
  customerName: z.string().min(1).max(255),
  scheduledAt: z.string().datetime().optional(),
  expirationDate: z.number().int().optional(),
  place: z.string().max(500).optional(),
  deliveryZoneName: z.string().max(255).optional(),
  deliveryAddressDetail: z.string().max(500).optional(),
  items: z.array(ReservationItemSchema).min(1),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
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

      await ds.transaction(async (txn) => {
        const bookingRepo = txn.getRepository(entityTableNames.WebBooking)
        const zoneRepo = txn.getRepository(entityTableNames.DeliveryZone)
        const addressRepo = txn.getRepository(entityTableNames.CustomAddress)
        const locationRepo = txn.getRepository(entityTableNames.PickupLocation)

        const existing = await bookingRepo.findOne({
          where: { appReservationId: reservation.appReservationId },
        })

        let locationId: string | null = existing?.locationId ?? null
        let customAddressId: string | null = existing?.customAddressId ?? null
        let deliveryZoneId: string | null = existing?.deliveryZoneId ?? null
        let deliveryFee = existing ? Number(existing.deliveryFee) : 0
        let roundTripMinutes: number | null = existing?.roundTripMinutes ?? null

        if (reservation.deliveryZoneName && reservation.deliveryAddressDetail) {
          const zoneName = reservation.deliveryZoneName.trim()
          const zones = await zoneRepo.find({ where: { isActive: true } })
          const zone =
            zones.find((z) => z.name.toLowerCase() === zoneName.toLowerCase()) ??
            zones.find((z) =>
              (z.aliases ?? []).some((alias: string) => alias.toLowerCase() === zoneName.toLowerCase()),
            )
          if (zone) {
            deliveryZoneId = zone.id
            deliveryFee = Number(zone.deliveryFee)
            roundTripMinutes = zone.roundTripMinutes
            const addressText = `${zone.name}, ${reservation.deliveryAddressDetail.trim()}`
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
        } else if (reservation.place) {
          const placeName = reservation.place.trim()
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

        const bookingTotal = totalAmount + deliveryFee

        if (existing) {
          await bookingRepo.update(existing.id, {
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
            comment: reservation.place ?? existing.comment,
            syncedToAppAt: new Date(),
          })
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

      upserted++
    }

    if (upserted > 0) {
      revalidatePath('/admin')
      revalidatePath('/admin/bookings')
    }

    return NextResponse.json({ upserted })
  })
}
