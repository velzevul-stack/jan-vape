import { getRepo } from '@/src/lib/db'
import { WebBooking } from '@/src/entities/WebBooking'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  pending: '#F5B854',
  confirmed: '#4ADE80',
  cancelled: '#9CA3AF',
  completed: '#6B7280',
}

export default async function AdminBookings() {
  const repo = await getRepo(WebBooking)
  const bookings = await repo.find({
    relations: { location: true, customAddress: true },
    order: { scheduledAt: 'ASC' },
    take: 100,
    where: { status: 'pending' },
  })

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Брони (ожидающие)</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
            <th style={{ padding: '8px 12px' }}>№</th>
            <th style={{ padding: '8px 12px' }}>Клиент</th>
            <th style={{ padding: '8px 12px' }}>Место</th>
            <th style={{ padding: '8px 12px' }}>Время</th>
            <th style={{ padding: '8px 12px' }}>Сумма</th>
            <th style={{ padding: '8px 12px' }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} style={{ borderBottom: '1px solid #1c1c1e' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#F5B854' }}>
                {b.publicNumber}
              </td>
              <td style={{ padding: '8px 12px' }}>{b.customerName}</td>
              <td style={{ padding: '8px 12px', color: '#aaa' }}>
                {b.location?.name ?? b.customAddress?.label ?? '—'}
              </td>
              <td style={{ padding: '8px 12px' }}>
                {b.scheduledAt.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}
              </td>
              <td style={{ padding: '8px 12px' }}>{Number(b.totalAmount).toFixed(2)} BYN</td>
              <td style={{ padding: '8px 12px' }}>
                <span
                  style={{
                    background: STATUS_COLORS[b.status] + '33',
                    color: STATUS_COLORS[b.status],
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {b.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
