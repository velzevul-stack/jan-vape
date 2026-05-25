import { NextResponse } from 'next/server'
import { getRepo } from '@/src/lib/db'
import { PickupLocation } from '@/src/entities/PickupLocation'
import { CustomAddress } from '@/src/entities/CustomAddress'

export async function GET(): Promise<NextResponse> {
  const locationRepo = await getRepo(PickupLocation)
  const addressRepo = await getRepo(CustomAddress)

  const [locations, promotedAddresses] = await Promise.all([
    locationRepo.find({
      where: { isActive: true },
      order: { isFeatured: 'DESC', sortOrder: 'ASC' },
    }),
    addressRepo.find({
      where: { isPromoted: true },
      order: { salesCount: 'DESC' },
      take: 20,
    }),
  ])

  return NextResponse.json({
    locations: locations.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      address: l.address,
      isFeatured: l.isFeatured,
      workDayStart: l.workDayStart,
      workDayEnd: l.workDayEnd,
    })),
    promotedAddresses: promotedAddresses.map((a) => ({
      id: a.id,
      label: a.label,
      salesCount: a.salesCount,
    })),
  })
}
