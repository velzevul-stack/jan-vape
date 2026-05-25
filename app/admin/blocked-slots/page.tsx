import { getRepo } from '@/src/lib/db'
import { BlockedSlot } from '@/src/entities/BlockedSlot'

export const dynamic = 'force-dynamic'

export default async function AdminBlockedSlots() {
  const repo = await getRepo(BlockedSlot)
  const slots = await repo.find({
    relations: { location: true, customAddress: true },
    order: { startsAt: 'ASC' },
  })

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Блокировки слотов</h1>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
        Используйте POST /api/admin/blocked-slots для добавления новых блокировок.
        locationId=null означает блокировку для всех точек.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
            <th style={{ padding: '8px 12px' }}>Место</th>
            <th style={{ padding: '8px 12px' }}>С</th>
            <th style={{ padding: '8px 12px' }}>По</th>
            <th style={{ padding: '8px 12px' }}>Причина</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #1c1c1e' }}>
              <td style={{ padding: '8px 12px' }}>
                {s.location?.name ?? s.customAddress?.label ?? 'Все точки'}
              </td>
              <td style={{ padding: '8px 12px' }}>
                {s.startsAt.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}
              </td>
              <td style={{ padding: '8px 12px' }}>
                {s.endsAt.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}
              </td>
              <td style={{ padding: '8px 12px', color: '#aaa' }}>{s.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
