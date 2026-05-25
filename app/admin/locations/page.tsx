import { getRepo } from '@/src/lib/db'
import { PickupLocation } from '@/src/entities/PickupLocation'

export const dynamic = 'force-dynamic'

export default async function AdminLocations() {
  const repo = await getRepo(PickupLocation)
  const locations = await repo.find({ order: { sortOrder: 'ASC' } })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Точки выдачи</h1>
        <a
          href="/admin/locations/new"
          style={{
            background: '#F5B854',
            color: '#0a0a0a',
            borderRadius: 8,
            padding: '8px 16px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + Добавить
        </a>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
            <th style={{ padding: '8px 12px' }}>Код</th>
            <th style={{ padding: '8px 12px' }}>Название</th>
            <th style={{ padding: '8px 12px' }}>Адрес</th>
            <th style={{ padding: '8px 12px' }}>Часы</th>
            <th style={{ padding: '8px 12px' }}>Шаг</th>
            <th style={{ padding: '8px 12px' }}>Активна</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((l) => (
            <tr key={l.id} style={{ borderBottom: '1px solid #1c1c1e', opacity: l.isActive ? 1 : 0.4 }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#F5B854' }}>{l.code}</td>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{l.name}</td>
              <td style={{ padding: '8px 12px', color: '#aaa' }}>{l.address || '—'}</td>
              <td style={{ padding: '8px 12px' }}>{l.workDayStart}–{l.workDayEnd}</td>
              <td style={{ padding: '8px 12px' }}>{l.slotStepMinutes} мин</td>
              <td style={{ padding: '8px 12px' }}>{l.isActive ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
