import { getRepo } from '@/src/lib/db'
import { CustomAddress } from '@/src/entities/CustomAddress'

export const dynamic = 'force-dynamic'

export default async function AdminAddresses() {
  const repo = await getRepo(CustomAddress)
  const addresses = await repo.find({ order: { salesCount: 'DESC' }, take: 100 })

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Адреса клиентов</h1>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
        Адреса с ≥10 продажами автоматически помечаются promoted и показываются в списке выбора на сайте.
        Управляйте вручную через PATCH /api/admin/addresses/[id].
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
            <th style={{ padding: '8px 12px' }}>Адрес</th>
            <th style={{ padding: '8px 12px' }}>Продаж</th>
            <th style={{ padding: '8px 12px' }}>Promoted</th>
            <th style={{ padding: '8px 12px' }}>Добавлен</th>
          </tr>
        </thead>
        <tbody>
          {addresses.map((a) => (
            <tr key={a.id} style={{ borderBottom: '1px solid #1c1c1e' }}>
              <td style={{ padding: '8px 12px' }}>{a.label}</td>
              <td style={{ padding: '8px 12px', color: a.salesCount >= 10 ? '#4ADE80' : '#aaa' }}>
                {a.salesCount}
              </td>
              <td style={{ padding: '8px 12px' }}>
                {a.isPromoted ? (
                  <span style={{ color: '#4ADE80', fontWeight: 600 }}>✓ Да</span>
                ) : (
                  <span style={{ color: '#6B7280' }}>—</span>
                )}
              </td>
              <td style={{ padding: '8px 12px', color: '#aaa' }}>
                {a.createdAt.toLocaleDateString('ru-RU')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
