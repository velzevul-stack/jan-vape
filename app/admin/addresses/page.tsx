import { getRepo } from '@/src/lib/db'
import { AddressManager } from '@/components/admin/AddressManager'
import type { AddressRow } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminAddresses() {
  const repo = await getRepo('CustomAddress')
  const addresses = await repo.find({ order: { salesCount: 'DESC' }, take: 200 })

  const rows: AddressRow[] = addresses.map((a) => ({
    id: a.id,
    label: a.label,
    salesCount: a.salesCount,
    isPromoted: a.isPromoted,
    createdAt: a.createdAt.toLocaleDateString('ru-RU'),
  }))

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Адреса клиентов</h1>
          <p className="admin-page-subtitle">
            Адреса с ≥10 продажами автоматически становятся promoted. Можно включить или выключить вручную.
          </p>
        </div>
      </div>

      <AddressManager addresses={rows} />
    </div>
  )
}
