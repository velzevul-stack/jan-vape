import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

function checkAuth(authHeader: string | null): boolean {
  const expected = process.env.ADMIN_BASIC_AUTH ?? ''
  if (!expected || !authHeader?.startsWith('Basic ')) return false
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8')
  return decoded === expected
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hdrs = await headers()
  const auth = hdrs.get('authorization')

  if (!checkAuth(auth)) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin"',
        'Content-Type': 'text/plain',
      },
    }) as unknown as React.ReactElement
  }

  return (
    <html lang="ru">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', color: '#f5f5f5', margin: 0 }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <nav style={{ width: 220, background: '#1c1c1e', padding: '24px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: '#F5B854' }}>
              Vapestore Admin
            </div>
            <NavLink href="/admin">Сводка</NavLink>
            <NavLink href="/admin/locations">Точки выдачи</NavLink>
            <NavLink href="/admin/addresses">Адреса</NavLink>
            <NavLink href="/admin/blocked-slots">Блокировки</NavLink>
            <NavLink href="/admin/bookings">Брони</NavLink>
          </nav>
          <main style={{ flex: 1, padding: 32 }}>{children}</main>
        </div>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: 'block',
        padding: '10px 12px',
        marginBottom: 4,
        borderRadius: 8,
        color: '#f5f5f5',
        textDecoration: 'none',
        fontSize: 14,
      }}
    >
      {children}
    </a>
  )
}
