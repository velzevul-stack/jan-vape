'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/admin/api-client'
import type { BlockedSlotRow, LocationOption } from '@/lib/admin/types'

type Props = {
  slots: BlockedSlotRow[]
  locations: LocationOption[]
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

export function BlockedSlotManager({ slots, locations }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    scope: 'all' as 'all' | 'location',
    locationId: locations[0]?.id ?? '',
    startsAt: '',
    endsAt: '',
    reason: '',
  })

  const upcoming = slots.filter((s) => !s.isPast)
  const past = slots.filter((s) => s.isPast)

  async function createSlot(e: React.FormEvent) {
    e.preventDefault()
    setBusyId('create')
    setError(null)
    const payload = {
      startsAt: fromLocalInputValue(form.startsAt),
      endsAt: fromLocalInputValue(form.endsAt),
      reason: form.reason || undefined,
      ...(form.scope === 'location' && form.locationId ? { locationId: form.locationId } : {}),
    }
    const result = await adminFetch('/api/admin/blocked-slots', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Блокировка добавлена')
    setShowCreate(false)
    setForm((f) => ({ ...f, startsAt: '', endsAt: '', reason: '' }))
    router.refresh()
  }

  async function removeSlot(id: string) {
    if (!confirm('Разблокировать этот интервал времени?')) return
    setBusyId(id)
    setError(null)
    const result = await adminFetch(`/api/admin/blocked-slots/${id}`, { method: 'DELETE' })
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Интервал разблокирован')
    router.refresh()
  }

  return (
    <div>
      {(message || error) && (
        <div className={`admin-feedback ${error ? 'is-error' : 'is-success'}`}>
          {error ?? message}
        </div>
      )}

      <div className="admin-toolbar">
        <button type="button" className="admin-button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Скрыть форму' : '+ Заблокировать слоты'}
        </button>
      </div>

      {showCreate && (
        <form className="admin-card admin-form" onSubmit={createSlot}>
          <h2 className="admin-form-title">Новая блокировка</h2>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span className="admin-label">Область</span>
              <select
                className="admin-input"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as 'all' | 'location' }))}
              >
                <option value="all">Все точки</option>
                <option value="location">Конкретная точка</option>
              </select>
            </label>
            {form.scope === 'location' && (
              <label className="admin-field">
                <span className="admin-label">Точка</span>
                <select
                  className="admin-input"
                  value={form.locationId}
                  onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                  required
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </label>
            )}
            <label className="admin-field">
              <span className="admin-label">С</span>
              <input
                className="admin-input"
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">По</span>
              <input
                className="admin-input"
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </label>
            <label className="admin-field admin-span-2">
              <span className="admin-label">Причина</span>
              <input
                className="admin-input"
                value={form.reason}
                placeholder="Обед, праздник…"
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="admin-button" disabled={busyId === 'create'}>
              {busyId === 'create' ? 'Сохранение…' : 'Заблокировать'}
            </button>
          </div>
        </form>
      )}

      {slots.length === 0 ? (
        <div className="admin-card admin-empty">
          <div className="admin-empty-icon">∅</div>
          <p style={{ margin: 0 }}>Активных блокировок нет.</p>
        </div>
      ) : (
        <>
          <SlotSection title={`Актуальные (${upcoming.length})`} rows={upcoming} busyId={busyId} onUnblock={removeSlot} />
          {past.length > 0 && (
            <SlotSection title={`Прошедшие (${past.length})`} rows={past} busyId={busyId} onUnblock={removeSlot} muted />
          )}
        </>
      )}
    </div>
  )
}

function SlotSection({
  title,
  rows,
  busyId,
  onUnblock,
  muted,
}: {
  title: string
  rows: BlockedSlotRow[]
  busyId: string | null
  onUnblock: (id: string) => void
  muted?: boolean
}) {
  if (rows.length === 0) {
    return (
      <div className="admin-card admin-empty" style={{ padding: 18, marginBottom: 16 }}>
        {title}: пусто.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 24, opacity: muted ? 0.65 : 1 }}>
      <h2 className="admin-section-title">{title}</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Место</th>
              <th>С</th>
              <th>По</th>
              <th>Причина</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.locationName ?? s.customAddressLabel ?? (
                    <span className="admin-badge" data-tone="on">все точки</span>
                  )}
                </td>
                <td className="admin-mono">{formatDt(s.startsAt)}</td>
                <td className="admin-mono">{formatDt(s.endsAt)}</td>
                <td className="admin-muted">{s.reason ?? '—'}</td>
                <td>
                  <button
                    type="button"
                    className="admin-button sm mint"
                    disabled={busyId === s.id}
                    onClick={() => onUnblock(s.id)}
                  >
                    {busyId === s.id ? '…' : 'Разблокировать'}
                  </button>
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
