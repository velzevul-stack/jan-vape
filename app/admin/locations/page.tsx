import { getRepo } from '@/src/lib/db'
import { PickupLocation } from '@/src/entities/PickupLocation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminLocations() {
  const repo = await getRepo(PickupLocation)
  const locations = await repo.find({ order: { sortOrder: 'ASC' } })

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Точки выдачи</h1>
          <p className="admin-page-subtitle">
            Адреса магазинов, где клиенты забирают забронированные заказы.
            Управление через API: <span className="admin-kbd">POST /api/admin/locations</span>.
          </p>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="admin-card admin-empty">
          <div className="admin-empty-icon">⌖</div>
          <p style={{ margin: 0 }}>Ни одной активной точки выдачи.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Название</th>
                <th>Адрес</th>
                <th>Часы</th>
                <th>Шаг</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id} style={{ opacity: l.isActive ? 1 : 0.5 }}>
                  <td className="admin-mono">{l.code}</td>
                  <td style={{ fontWeight: 600 }}>{l.name}</td>
                  <td className="admin-muted">{l.address || <span className="admin-faint">—</span>}</td>
                  <td className="admin-mono">
                    {l.workDayStart}–{l.workDayEnd}
                  </td>
                  <td>{l.slotStepMinutes} мин</td>
                  <td>
                    <span className="admin-badge" data-tone={l.isActive ? 'on' : 'off'}>
                      {l.isActive ? 'активна' : 'выключена'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
