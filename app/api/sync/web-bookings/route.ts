import { NextRequest, NextResponse } from 'next/server'
import { verifySyncAuth } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { WebBooking } from '@/src/entities/WebBooking'
import { MoreThanOrEqual } from 'typeorm'

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifySyncAuth(req, '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sinceMs = parseInt(req.nextUrl.searchParams.get('since') ?? '0', 10)
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10),
    500,
  )

  const repo = await getRepo(WebBooking)
  const since = new Date(sinceMs || 0)

  const bookings = await repo.find({
    where: { updatedAt: MoreThanOrEqual(since) },
    relations: { location: true, customAddress: true },
    order: { updatedAt: 'ASC' },
    take: limit,
  })

  const result = bookings.map((b) => ({
    id: b.id,
    publicNumber: b.publicNumber,
    source: b.source,
    customerName: b.customerName,
    customerTelegram: b.customerTelegram,
    comment: b.comment,
    scheduledAt: b.scheduledAt.getTime(),
    locationId: b.locationId,
    locationName: b.location?.name ?? null,
    locationAddress: b.location?.address ?? null,
    customAddressId: b.customAddressId,
    customAddressLabel: b.customAddress?.label ?? null,
    items: b.items,
    totalAmount: Number(b.totalAmount),
    status: b.status,
    appReservationId: b.appReservationId,
    createdAt: b.createdAt.getTime(),
    updatedAt: b.updatedAt.getTime(),
  }))

  return NextResponse.json({ bookings: result, count: result.length })
}
