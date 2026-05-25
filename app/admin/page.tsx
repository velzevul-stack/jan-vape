import { getRepo } from '@/src/lib/db'
import { WebBooking } from '@/src/entities/WebBooking'
import { SyncCursor } from '@/src/entities/SyncCursor'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [bookingRepo, cursorRepo] = await Promise.all([
    getRepo(WebBooking),
    getRepo(SyncCursor),
  ])

  const [pendingCount, confirmedCount, cursors] = await Promise.all([
    bookingRepo.count({ where: { status: 'pending' } }),
    bookingRepo.count({ where: { status: 'confirmed' } }),
    cursorRepo.find({ order: { lastHeartbeatAt: 'DESC' }, take: 10 }),
  ])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Сводка</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <StatCard label="Ожидающие брони" value={pendingCount} color="#F5B854" />
        <StatCard label="Подтверждённые" value={confirmedCount} color="#4ADE80" />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Приложения (heartbeat)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
            <th style={{ padding: '8px 12px' }}>Client ID</th>
            <th style={{ padding: '8px 12px' }}>Версия</th>
            <th style={{ padding: '8px 12px' }}>Последний heartbeat</th>
          </tr>
        </thead>
        <tbody>
          {cursors.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '8px 12px', color: '#aaa' }}>{c.clientId.slice(0, 20)}…</td>
              <td style={{ padding: '8px 12px' }}>{c.appVersion ?? '—'}</td>
              <td style={{ padding: '8px 12px' }}>{c.lastHeartbeatAt.toLocaleString('ru-RU')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: '#1c1c1e',
        borderRadius: 12,
        padding: '20px 24px',
        minWidth: 160,
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>{label}</div>
    </div>
  )
}
