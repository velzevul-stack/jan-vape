import Link from 'next/link'
import { getRepo } from '@/src/lib/db'
import { BookingManager } from '@/components/admin/BookingManager'
import type { BookingRow, BookingStatus } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FILTERS: Array<{ id: 'all' | BookingStatus; label: string }> = [
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
  const filter = (params.status ?? 'pending') as 'all' | BookingStatus

  const repo = await getRepo('WebBooking')
  const where = filter === 'all' ? {} : { status: filter }
  const bookings = await repo.find({
    relations: { location: true, customAddress: true },
    order: { scheduledAt: 'ASC' },
    take: 200,
    where,
  })

  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    publicNumber: b.publicNumber,
    customerName: b.customerName,
    customerTelegram: b.customerTelegram,
    placeLabel: b.location?.name ?? b.customAddress?.label ?? '—',
    scheduledAt: b.scheduledAt.toISOString(),
    totalAmount: Number(b.totalAmount),
    status: b.status,
    itemsCount: b.items.length,
  }))

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Брони</h1>
          <p className="admin-page-subtitle">
            Заказы с сайта. Подтверждайте, отменяйте и завершайте прямо из таблицы.
          </p>
        </div>
      </div>

      <div className="admin-filter-row">
        {FILTERS.map((f) => {
          const active = f.id === filter
          return (
            <Link
              key={f.id}
              href={f.id === 'all' ? '/admin/bookings?status=all' : `/admin/bookings?status=${f.id}`}
              className={`admin-filter-chip ${active ? 'is-active' : ''}`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <BookingManager bookings={rows} />
    </div>
  )
}
