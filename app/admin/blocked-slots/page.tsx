import { getRepo } from '@/src/lib/db'
import { BlockedSlotManager } from '@/components/admin/BlockedSlotManager'
import type { BlockedSlotRow, LocationOption } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminBlockedSlots() {
  const [slotRepo, locationRepo] = await Promise.all([
    getRepo('BlockedSlot'),
    getRepo('PickupLocation'),
  ])

  const [slots, locations] = await Promise.all([
    slotRepo.find({
      relations: { location: true, customAddress: true },
      order: { startsAt: 'ASC' },
    }),
    locationRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } }),
  ])

  const now = Date.now()

  const slotRows: BlockedSlotRow[] = slots.map((s) => ({
    id: s.id,
    locationId: s.locationId,
    locationName: s.location?.name ?? null,
    customAddressLabel: s.customAddress?.label ?? null,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    reason: s.reason,
    isPast: s.endsAt.getTime() < now,
  }))

  const locationOptions: LocationOption[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
  }))

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Блокировки слотов</h1>
          <p className="admin-page-subtitle">
            Блокируйте и разблокируйте интервалы для обеда, праздников и форс-мажора. Разблокировка сразу возвращает слоты в календарь на сайте.
          </p>
        </div>
      </div>

      <BlockedSlotManager slots={slotRows} locations={locationOptions} />
    </div>
  )
}
