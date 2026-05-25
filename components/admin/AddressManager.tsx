'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { adminFetch } from '@/lib/admin/api-client'
import type { AddressRow } from '@/lib/admin/types'

type Props = {
  addresses: AddressRow[]
}

export function AddressManager({ addresses }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function togglePromoted(address: AddressRow) {
    setBusyId(address.id)
    setError(null)
    const result = await adminFetch(`/api/admin/addresses/${address.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPromoted: !address.isPromoted }),
    })
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage(address.isPromoted ? 'Адрес убран из быстрых чипов' : 'Адрес добавлен в быстрые чипы')
    router.refresh()
  }

  return (
    <div>
      {(message || error) && (
        <div className={`admin-feedback ${error ? 'is-error' : 'is-success'}`}>
          {error ?? message}
        </div>
      )}

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
                <th>Действия</th>
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
                  <td className="admin-muted">{a.createdAt}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-button sm ghost"
                      disabled={busyId === a.id}
                      onClick={() => togglePromoted(a)}
                    >
                      {busyId === a.id
                        ? '…'
                        : a.isPromoted
                          ? 'Убрать promoted'
                          : 'Сделать promoted'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
