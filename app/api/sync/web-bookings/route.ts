import { NextRequest, NextResponse } from 'next/server'
import { verifySyncAuth } from '@/src/lib/auth'
import { getCustomerStatsMap } from '@/src/lib/customerStats'
import { getRepo } from '@/src/lib/db'
import { telegramLookupKey } from '@/src/lib/telegramBooking'
import { In, MoreThan } from 'typeorm'

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifySyncAuth(req, '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pendingOnly = req.nextUrl.searchParams.get('pending') === '1'
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10),
    500,
  )

  const repo = await getRepo('WebBooking')

  const bookings = pendingOnly
    ? await repo.find({
        where: { status: 'pending' },
        relations: { location: true, customAddress: true, deliveryZone: true },
        order: { createdAt: 'DESC' },
        take: limit,
      })
    : await (async () => {
        const sinceMs = parseInt(req.nextUrl.searchParams.get('since') ?? '0', 10)
        const since = new Date(sinceMs || 0)
        return repo.find({
          where: { updatedAt: MoreThan(since) },
          relations: { location: true, customAddress: true, deliveryZone: true },
          order: { updatedAt: 'ASC' },
          take: limit,
        })
      })()

  const snapshotIds = Array.from(
    new Set(bookings.flatMap((b) => b.items.map((item) => item.productId))),
  )
  const productRepo = await getRepo('ProductSnapshot')
  const snapshots =
    snapshotIds.length > 0
      ? await productRepo.find({ where: { id: In(snapshotIds) } })
      : []
  const snapshotById = new Map(snapshots.map((p) => [p.id, p]))

  const statsByTelegram = await getCustomerStatsMap(
    bookings.map((booking) => booking.customerTelegram),
  )

  const result = bookings.map((b) => {
    const stats = statsByTelegram.get(telegramLookupKey(b.customerTelegram))
    return {
      id: b.id,
      publicNumber: b.publicNumber,
      source: b.source,
      customerName: b.customerName,
      customerTelegram: b.customerTelegram,
      customerTrustLevel: stats?.trustLevel ?? 'blue',
      customerWarnings: stats?.warnings ?? ['tg_unverified'],
      comment: b.comment,
      scheduledAt: b.scheduledAt.getTime(),
      locationId: b.locationId,
      locationName: b.location?.name ?? null,
      locationAddress: b.location?.address ?? null,
      customAddressId: b.customAddressId,
      customAddressLabel: b.customAddress?.label ?? null,
      deliveryZoneId: b.deliveryZoneId,
      deliveryZoneName: b.deliveryZone?.name ?? null,
      deliveryFee: Number(b.deliveryFee ?? 0),
      roundTripMinutes: b.roundTripMinutes,
      items: b.items.map((item) => {
        const product = snapshotById.get(item.productId)
        return {
          ...item,
          externalId: product?.externalId ?? null,
          brand: product?.brand ?? '',
          flavor: product?.flavor ?? '',
        }
      }),
      totalAmount: Number(b.totalAmount),
      status: b.status,
      appReservationId: b.appReservationId,
      createdAt: b.createdAt.getTime(),
      updatedAt: b.updatedAt.getTime(),
    }
  })

  return NextResponse.json({ bookings: result, count: result.length })
}
