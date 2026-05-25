'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { adminFetch } from '@/lib/admin/api-client'
import type { BookingRow, BookingStatus } from '@/lib/admin/types'

type Props = {
  bookings: BookingRow[]
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'ожидает',
  confirmed: 'подтверждена',
  cancelled: 'отменена',
  completed: 'завершена',
}

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  completed: 'completed',
}

const NEXT_ACTIONS: Record<BookingStatus, Array<{ status: BookingStatus; label: string; tone?: string }>> = {
  pending: [
    { status: 'confirmed', label: 'Подтвердить', tone: 'mint' },
    { status: 'cancelled', label: 'Отменить', tone: 'danger' },
  ],
  confirmed: [
    { status: 'completed', label: 'Завершить', tone: 'mint' },
    { status: 'cancelled', label: 'Отменить', tone: 'danger' },
  ],
  cancelled: [
    { status: 'pending', label: 'Вернуть в ожидание' },
  ],
  completed: [
    { status: 'confirmed', label: 'Снова подтвердить' },
  ],
}

export function BookingManager({ bookings }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function setStatus(id: string, status: BookingStatus) {
    setBusyId(id)
    setError(null)
    const result = await adminFetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage(`Статус изменён: ${STATUS_LABEL[status]}`)
    router.refresh()
  }

  if (bookings.length === 0) {
    return (
      <div className="admin-card admin-empty">
        <div className="admin-empty-icon">∅</div>
        <p style={{ margin: 0 }}>Нет броней в этой категории.</p>
      </div>
    )
  }

  return (
    <div>
      {(message || error) && (
        <div className={`admin-feedback ${error ? 'is-error' : 'is-success'}`}>
          {error ?? message}
        </div>
      )}

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
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="admin-mono">{b.publicNumber}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                  <div className="admin-faint" style={{ fontSize: 11 }}>{b.customerTelegram}</div>
                  <div className="admin-faint" style={{ fontSize: 11 }}>{b.itemsCount} поз.</div>
                </td>
                <td className="admin-muted">{b.placeLabel}</td>
                <td>{formatDt(b.scheduledAt)}</td>
                <td className="admin-mono">{b.totalAmount.toFixed(2)} BYN</td>
                <td>
                  <span className="admin-badge" data-tone={STATUS_TONE[b.status]}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
                <td>
                  <div className="admin-inline-actions">
                    {NEXT_ACTIONS[b.status].map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        className={`admin-button sm ghost ${action.tone === 'danger' ? 'danger' : action.tone === 'mint' ? 'mint' : ''}`}
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b.id, action.status)}
                      >
                        {busyId === b.id ? '…' : action.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Europe/Minsk',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
