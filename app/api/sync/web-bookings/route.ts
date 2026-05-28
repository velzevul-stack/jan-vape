import { NextRequest, NextResponse } from 'next/server'
import { verifySyncAuth } from '@/src/lib/auth'
import { getCustomerStatsMap } from '@/src/lib/customerStats'
import { getRepo } from '@/src/lib/db'
import { telegramLookupKey } from '@/src/lib/telegramBooking'
import { WebBooking } from '@/src/entities/WebBooking'
import { In, MoreThanOrEqual } from 'typeorm'

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifySyncAuth(req, '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sinceMs = parseInt(req.nextUrl.searchParams.get('since') ?? '0', 10)
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10),
    500,
  )

  const repo = await getRepo('WebBooking')
  const since = new Date(sinceMs || 0)

  const bookings = await repo.find({
    where: { updatedAt: MoreThanOrEqual(since) },
    relations: { location: true, customAddress: true },
    order: { updatedAt: 'ASC' },
    take: limit,
  })

  const snapshotIds = Array.from(
    new Set(bookings.flatMap((b) => b.items.map((item) => item.productId))),
  )
  const productRepo = await getRepo('ProductSnapshot')
  const snapshots =
    snapshotIds.length > 0
      ? await productRepo.find({ where: { id: In(snapshotIds) } })
      : []
  const externalIdBySnapshotId = new Map(
    snapshots.map((p) => [p.id, p.externalId] as const),
  )

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
      items: b.items.map((item) => ({
        ...item,
        externalId: externalIdBySnapshotId.get(item.productId) ?? null,
      })),
      totalAmount: Number(b.totalAmount),
      status: b.status,
      appReservationId: b.appReservationId,
      createdAt: b.createdAt.getTime(),
      updatedAt: b.updatedAt.getTime(),
    }
  })

  return NextResponse.json({ bookings: result, count: result.length })
}
