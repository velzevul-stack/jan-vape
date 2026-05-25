import { getRepo } from '@/src/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboard() {
  const [bookingRepo, cursorRepo] = await Promise.all([
    getRepo('WebBooking'),
    getRepo('SyncCursor'),
  ])

  const [pendingCount, confirmedCount, cancelledCount, completedCount, cursors] = await Promise.all([
    bookingRepo.count({ where: { status: 'pending' } }),
    bookingRepo.count({ where: { status: 'confirmed' } }),
    bookingRepo.count({ where: { status: 'cancelled' } }),
    bookingRepo.count({ where: { status: 'completed' } }),
    cursorRepo.find({ order: { lastHeartbeatAt: 'DESC' }, take: 10 }),
  ])

  const now = Date.now()

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Сводка</h1>
          <p className="admin-page-subtitle">
            Состояние броней и активность приложений-кассиров в режиме реального времени.
          </p>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat" data-tone="warn">
          <div className="admin-stat-value">{pendingCount}</div>
          <div className="admin-stat-label">Ожидают подтверждения</div>
        </div>
        <div className="admin-stat" data-tone="success">
          <div className="admin-stat-value">{confirmedCount}</div>
          <div className="admin-stat-label">Подтверждённые</div>
        </div>
        <div className="admin-stat" data-tone="muted">
          <div className="admin-stat-value">{completedCount}</div>
          <div className="admin-stat-label">Закрыто</div>
        </div>
        <div className="admin-stat" data-tone="danger">
          <div className="admin-stat-value">{cancelledCount}</div>
          <div className="admin-stat-label">Отменено</div>
        </div>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Подключённые приложения</h2>
          <span className="admin-faint" style={{ fontSize: 12 }}>
            heartbeat · последние {cursors.length}
          </span>
        </div>

        {cursors.length === 0 ? (
          <div className="admin-empty">
            Пока ни одно приложение не отправляло heartbeat. Откройте Vapestore и проверьте экран «Синхронизация».
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Версия</th>
                  <th>Heartbeat</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {cursors.map((c) => {
                  const ageMin = Math.round((now - c.lastHeartbeatAt.getTime()) / 60_000)
                  const online = ageMin < 5
                  return (
                    <tr key={c.id}>
                      <td className="admin-mono" title={c.clientId}>{c.clientId.slice(0, 24)}…</td>
                      <td>{c.appVersion ?? <span className="admin-faint">—</span>}</td>
                      <td>
                        <span className="admin-muted">
                          {c.lastHeartbeatAt.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}
                        </span>
                      </td>
                      <td>
                        <span className="admin-badge" data-tone={online ? 'confirmed' : 'off'}>
                          {online ? `online · ${ageMin} мин назад` : `offline · ${formatAge(ageMin)}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function formatAge(min: number): string {
  if (min < 60) return `${min} мин`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч`
  const d = Math.floor(h / 24)
  return `${d} д`
}
