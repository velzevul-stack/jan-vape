'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/admin/api-client'
import type { LocationRow } from '@/lib/admin/types'

type Props = {
  locations: LocationRow[]
}

const EMPTY_CREATE = {
  code: '',
  name: '',
  address: '',
  workDayStart: '10:00',
  workDayEnd: '21:00',
  slotStepMinutes: 5,
  maxBookingsPerSlot: 1,
  sortOrder: 0,
  isFeatured: true,
}

export function LocationManager({ locations }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<LocationRow>>({})

  function flash(ok: string) {
    setError(null)
    setMessage(ok)
    router.refresh()
  }

  async function createLocation(e: React.FormEvent) {
    e.preventDefault()
    setBusyId('create')
    setError(null)
    const result = await adminFetch('/api/admin/locations', {
      method: 'POST',
      body: JSON.stringify({ ...createForm, isActive: true }),
    })
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setCreateForm(EMPTY_CREATE)
    setShowCreate(false)
    flash('Точка создана')
  }

  async function patchLocation(id: string, patch: Record<string, unknown>) {
    setBusyId(id)
    setError(null)
    const result = await adminFetch(`/api/admin/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setEditId(null)
    flash('Сохранено')
  }

  async function deactivateLocation(id: string) {
    if (!confirm('Выключить точку выдачи?')) return
    setBusyId(id)
    setError(null)
    const result = await adminFetch(`/api/admin/locations/${id}`, { method: 'DELETE' })
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    flash('Точка выключена')
  }

  function startEdit(location: LocationRow) {
    setEditId(location.id)
    setEditForm({ ...location })
  }

  return (
    <div>
      <AdminFeedback message={message} error={error} />

      <div className="admin-toolbar">
        <button
          type="button"
          className="admin-button"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Скрыть форму' : '+ Новая точка'}
        </button>
      </div>

      {showCreate && (
        <form className="admin-card admin-form" onSubmit={createLocation}>
          <h2 className="admin-form-title">Новая точка выдачи</h2>
          <div className="admin-grid-2">
            <Field label="Код" value={createForm.code} onChange={(v) => setCreateForm((f) => ({ ...f, code: v }))} required />
            <Field label="Название" value={createForm.name} onChange={(v) => setCreateForm((f) => ({ ...f, name: v }))} required />
            <Field label="Адрес" value={createForm.address} onChange={(v) => setCreateForm((f) => ({ ...f, address: v }))} className="admin-span-2" />
            <Field label="Начало дня" value={createForm.workDayStart} onChange={(v) => setCreateForm((f) => ({ ...f, workDayStart: v }))} placeholder="10:00" />
            <Field label="Конец дня" value={createForm.workDayEnd} onChange={(v) => setCreateForm((f) => ({ ...f, workDayEnd: v }))} placeholder="21:00" />
            <Field label="Шаг слота (мин)" type="number" value={String(createForm.slotStepMinutes)} onChange={(v) => setCreateForm((f) => ({ ...f, slotStepMinutes: Number(v) }))} />
            <Field label="Макс. броней на слот" type="number" value={String(createForm.maxBookingsPerSlot)} onChange={(v) => setCreateForm((f) => ({ ...f, maxBookingsPerSlot: Number(v) }))} />
            <Field label="Порядок сортировки" type="number" value={String(createForm.sortOrder)} onChange={(v) => setCreateForm((f) => ({ ...f, sortOrder: Number(v) }))} />
            <label className="admin-check">
              <input
                type="checkbox"
                checked={createForm.isFeatured}
                onChange={(e) => setCreateForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
              Показывать в шапке сайта
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="admin-button" disabled={busyId === 'create'}>
              {busyId === 'create' ? 'Сохранение…' : 'Создать'}
            </button>
          </div>
        </form>
      )}

      {locations.length === 0 ? (
        <div className="admin-card admin-empty">
          <div className="admin-empty-icon">⌖</div>
          <p style={{ margin: 0 }}>Ни одной точки выдачи. Создайте первую кнопкой выше.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Название</th>
                <th>Адрес</th>
                <th>Часы</th>
                <th>Шаг</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <Fragment key={l.id}>
                  <tr style={{ opacity: l.isActive ? 1 : 0.55 }}>
                    <td className="admin-mono">{l.code}</td>
                    <td style={{ fontWeight: 600 }}>{l.name}</td>
                    <td className="admin-muted">{l.address || '—'}</td>
                    <td className="admin-mono">{l.workDayStart}–{l.workDayEnd}</td>
                    <td>{l.slotStepMinutes} мин</td>
                    <td>
                      <span className="admin-badge" data-tone={l.isActive ? 'on' : 'off'}>
                        {l.isActive ? 'активна' : 'выключена'}
                      </span>
                      {l.isFeatured && (
                        <span className="admin-badge" data-tone="promoted" style={{ marginLeft: 6 }}>
                          featured
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="admin-inline-actions">
                        <button type="button" className="admin-button sm ghost" onClick={() => startEdit(l)} disabled={busyId === l.id}>
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="admin-button sm ghost"
                          onClick={() => patchLocation(l.id, { isActive: !l.isActive })}
                          disabled={busyId === l.id}
                        >
                          {l.isActive ? 'Выключить' : 'Включить'}
                        </button>
                        <button
                          type="button"
                          className="admin-button sm ghost"
                          onClick={() => patchLocation(l.id, { isFeatured: !l.isFeatured })}
                          disabled={busyId === l.id}
                        >
                          {l.isFeatured ? 'Убрать из шапки' : 'В шапку'}
                        </button>
                        {l.isActive && (
                          <button type="button" className="admin-button sm danger" onClick={() => deactivateLocation(l.id)} disabled={busyId === l.id}>
                            Скрыть
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editId === l.id && (
                    <tr className="admin-edit-row">
                      <td colSpan={7}>
                        <form
                          className="admin-form admin-form-inline"
                          onSubmit={(e) => {
                            e.preventDefault()
                            patchLocation(l.id, {
                              name: editForm.name,
                              address: editForm.address,
                              workDayStart: editForm.workDayStart,
                              workDayEnd: editForm.workDayEnd,
                              slotStepMinutes: editForm.slotStepMinutes,
                              maxBookingsPerSlot: editForm.maxBookingsPerSlot,
                              sortOrder: editForm.sortOrder,
                            })
                          }}
                        >
                          <div className="admin-grid-2">
                            <Field label="Название" value={editForm.name ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} required />
                            <Field label="Адрес" value={editForm.address ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, address: v }))} />
                            <Field label="Начало" value={editForm.workDayStart ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, workDayStart: v }))} />
                            <Field label="Конец" value={editForm.workDayEnd ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, workDayEnd: v }))} />
                            <Field label="Шаг (мин)" type="number" value={String(editForm.slotStepMinutes ?? 5)} onChange={(v) => setEditForm((f) => ({ ...f, slotStepMinutes: Number(v) }))} />
                            <Field label="Макс. на слот" type="number" value={String(editForm.maxBookingsPerSlot ?? 1)} onChange={(v) => setEditForm((f) => ({ ...f, maxBookingsPerSlot: Number(v) }))} />
                          </div>
                          <div className="admin-form-actions">
                            <button type="submit" className="admin-button sm" disabled={busyId === l.id}>Сохранить</button>
                            <button type="button" className="admin-button sm ghost" onClick={() => setEditId(null)}>Отмена</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  className?: string
}) {
  return (
    <label className={`admin-field ${className ?? ''}`}>
      <span className="admin-label">{label}</span>
      <input
        className="admin-input"
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function AdminFeedback({ message, error }: { message: string | null; error: string | null }) {
  if (!message && !error) return null
  return (
    <div className={`admin-feedback ${error ? 'is-error' : 'is-success'}`}>
      {error ?? message}
    </div>
  )
}
