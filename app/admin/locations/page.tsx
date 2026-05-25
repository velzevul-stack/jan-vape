import { getRepo } from '@/src/lib/db'
import { LocationManager } from '@/components/admin/LocationManager'
import type { LocationRow } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminLocations() {
  const repo = await getRepo('PickupLocation')
  const locations = await repo.find({ order: { sortOrder: 'ASC' } })

  const rows: LocationRow[] = locations.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    address: l.address,
    isActive: l.isActive,
    isFeatured: l.isFeatured,
    sortOrder: l.sortOrder,
    workDayStart: l.workDayStart,
    workDayEnd: l.workDayEnd,
    maxBookingsPerSlot: l.maxBookingsPerSlot,
    slotStepMinutes: l.slotStepMinutes,
  }))

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Точки выдачи</h1>
          <p className="admin-page-subtitle">
            Создавайте и редактируйте магазины, где клиенты забирают заказы.
          </p>
        </div>
      </div>

      <LocationManager locations={rows} />
    </div>
  )
}
