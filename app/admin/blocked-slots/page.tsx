import { getRepo } from '@/src/lib/db'
import type { BlockedSlot } from '@/src/entities/BlockedSlot'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminBlockedSlots() {
  const repo = await getRepo('BlockedSlot')
  const slots = await repo.find({
    relations: { location: true, customAddress: true },
    order: { startsAt: 'ASC' },
  })

  const now = Date.now()
  const upcoming = slots.filter((s) => s.endsAt.getTime() >= now)
  const past = slots.filter((s) => s.endsAt.getTime() < now)

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Блокировки слотов</h1>
          <p className="admin-page-subtitle">
            Закрытые интервалы (обеды, праздники, форс-мажор). API: <span className="admin-kbd">POST /api/admin/blocked-slots</span>.
            <br />
            <code className="admin-muted">locationId = null</code> блокирует слот сразу для всех точек.
          </p>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="admin-card admin-empty">
          <div className="admin-empty-icon">∅</div>
          <p style={{ margin: 0 }}>Активных блокировок нет.</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 14, color: 'var(--admin-text-muted)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
            Актуальные ({upcoming.length})
          </h2>
          <SlotTable rows={upcoming} />

          {past.length > 0 && (
            <>
              <h2 style={{ fontSize: 14, color: 'var(--admin-text-muted)', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '24px 0 10px' }}>
                Прошедшие ({past.length})
              </h2>
              <div style={{ opacity: 0.6 }}>
                <SlotTable rows={past} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function SlotTable({ rows }: { rows: BlockedSlot[] }) {
  if (rows.length === 0) {
    return (
      <div className="admin-card admin-empty" style={{ padding: 18 }}>
        Пусто.
      </div>
    )
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Место</th>
            <th>С</th>
            <th>По</th>
            <th>Причина</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>
                {s.location?.name ?? s.customAddress?.label ?? (
                  <span className="admin-badge" data-tone="on">все точки</span>
                )}
              </td>
              <td className="admin-mono">
                {s.startsAt.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}
              </td>
              <td className="admin-mono">
                {s.endsAt.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}
              </td>
              <td className="admin-muted">{s.reason ?? <span className="admin-faint">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
