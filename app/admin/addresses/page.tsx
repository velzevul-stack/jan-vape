import { getRepo } from '@/src/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminAddresses() {
  const repo = await getRepo('CustomAddress')
  const addresses = await repo.find({ order: { salesCount: 'DESC' }, take: 200 })

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Адреса клиентов</h1>
          <p className="admin-page-subtitle">
            Адреса с ≥10 продажами автоматически становятся <strong>promoted</strong> и предлагаются клиентам в виде быстрых чипов.
            Управление вручную: <span className="admin-kbd">PATCH /api/admin/addresses/[id]</span>.
          </p>
        </div>
      </div>

      {addresses.length === 0 ? (
        <div className="admin-card admin-empty">
          <div className="admin-empty-icon">⌘</div>
          <p style={{ margin: 0 }}>Адреса клиентов пока не накопились.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Адрес</th>
                <th>Продаж</th>
                <th>Статус</th>
                <th>Добавлен</th>
              </tr>
            </thead>
            <tbody>
              {addresses.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.label}</td>
                  <td
                    className="admin-mono"
                    style={{ color: a.salesCount >= 10 ? 'var(--admin-mint)' : 'var(--admin-text-muted)' }}
                  >
                    {a.salesCount}
                  </td>
                  <td>
                    {a.isPromoted ? (
                      <span className="admin-badge" data-tone="promoted">promoted</span>
                    ) : (
                      <span className="admin-badge" data-tone="off">обычный</span>
                    )}
                  </td>
                  <td className="admin-muted">{a.createdAt.toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
