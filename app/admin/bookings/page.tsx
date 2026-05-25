import Link from 'next/link'
import { getRepo } from '@/src/lib/db'
import { WebBooking } from '@/src/entities/WebBooking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUS_TONE: Record<string, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  completed: 'completed',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'ожидает',
  confirmed: 'подтверждена',
  cancelled: 'отменена',
  completed: 'завершена',
}

const FILTERS: Array<{ id: 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'; label: string }> = [
  { id: 'pending', label: 'Ожидают' },
  { id: 'confirmed', label: 'Подтверждённые' },
  { id: 'completed', label: 'Завершённые' },
  { id: 'cancelled', label: 'Отменённые' },
  { id: 'all', label: 'Все' },
]

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const filter = params.status ?? 'pending'

  const repo = await getRepo(WebBooking)
  const where = filter === 'all' ? {} : { status: filter as WebBooking['status'] }
  const bookings = await repo.find({
    relations: { location: true, customAddress: true },
    order: { scheduledAt: 'ASC' },
    take: 200,
    where,
  })

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Брони</h1>
          <p className="admin-page-subtitle">
            Заказы с сайта. После подтверждения автоматически появляются в Vapestore-приложении кассира.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const active = f.id === filter
          return (
            <Link
              key={f.id}
              href={f.id === 'all' ? '/admin/bookings?status=all' : `/admin/bookings?status=${f.id}`}
              style={{
                padding: '8px 14px',
                borderRadius: 9999,
                border: '1px solid',
                borderColor: active ? 'rgba(201,162,78,0.5)' : 'var(--admin-border-strong)',
                background: active ? 'rgba(201,162,78,0.12)' : 'var(--admin-bg-soft)',
                color: active ? 'var(--admin-accent-soft)' : 'var(--admin-text-muted)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {bookings.length === 0 ? (
        <div className="admin-card admin-empty">
          <div className="admin-empty-icon">∅</div>
          <p style={{ margin: 0 }}>Нет броней в этой категории.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клиент</th>
                <th>Точка</th>
                <th>Время</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const tone = STATUS_TONE[b.status] ?? 'off'
                return (
                  <tr key={b.id}>
                    <td className="admin-mono">{b.publicNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                      <div className="admin-faint" style={{ fontSize: 11 }}>{b.customerTelegram}</div>
                    </td>
                    <td className="admin-muted">
                      {b.location?.name ?? b.customAddress?.label ?? <span className="admin-faint">—</span>}
                    </td>
                    <td>
                      {b.scheduledAt.toLocaleString('ru-RU', {
                        timeZone: 'Europe/Minsk',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="admin-mono">{Number(b.totalAmount).toFixed(2)} BYN</td>
                    <td>
                      <span className="admin-badge" data-tone={tone}>
                        {STATUS_LABEL[b.status] ?? b.status}
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
  )
}
