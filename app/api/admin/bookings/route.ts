import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyBasicAuth, verifySyncAuth, unauthorizedResponse, maskTelegram } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'

const QuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  const isBasic = verifyBasicAuth(req)
  const isHmac = !isBasic && verifySyncAuth(req, '')
  if (!isBasic && !isHmac) return unauthorizedResponse()

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  const { status, limit, offset } = parsed.data

  const repo = await getRepo('WebBooking')
  const qb = repo
    .createQueryBuilder('wb')
    .leftJoinAndSelect('wb.location', 'loc')
    .leftJoinAndSelect('wb.customAddress', 'ca')
    .leftJoinAndSelect('wb.deliveryZone', 'dz')
    .orderBy('wb.scheduledAt', 'ASC')
    .take(limit)
    .skip(offset)

  if (status) {
    qb.where('wb.status = :status', { status })
  }

  const [bookings, total] = await qb.getManyAndCount()
  const shouldMaskTelegram = !isHmac

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      publicNumber: b.publicNumber,
      customerName: b.customerName,
      customerTelegram: shouldMaskTelegram ? maskTelegram(b.customerTelegram) : b.customerTelegram,
      scheduledAt: b.scheduledAt.toISOString(),
      locationName: b.location?.name ?? null,
      customAddressLabel: b.customAddress?.label ?? null,
      deliveryZoneName: b.deliveryZone?.name ?? null,
      deliveryFee: Number(b.deliveryFee ?? 0),
      roundTripMinutes: b.roundTripMinutes,
      items: b.items,
      totalAmount: Number(b.totalAmount),
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      comment: b.comment ?? null,
    })),
    total,
  })
}
