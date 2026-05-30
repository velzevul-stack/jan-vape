import { NextResponse } from 'next/server'
import { getRepo } from '@/src/lib/db'

export async function GET(): Promise<NextResponse> {
  const repo = await getRepo('DeliveryZone')
  const zones = await repo.find({
    where: { isActive: true },
    order: { sortOrder: 'ASC', name: 'ASC' },
  })

  return NextResponse.json({
    zones: zones.map((zone) => ({
      id: zone.id,
      code: zone.code,
      name: zone.name,
      roundTripMinutes: zone.roundTripMinutes,
      deliveryFee: Number(zone.deliveryFee),
    })),
  })
}
