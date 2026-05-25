import { headers } from 'next/headers'
import Link from 'next/link'
import { Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import './admin.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})
const barlow = Barlow_Condensed({
  weight: ['600', '700', '800', '900'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-barlow',
  display: 'swap',
})
const mono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

function checkAuth(authHeader: string | null): boolean {
  const expected = process.env.ADMIN_BASIC_AUTH ?? ''
  if (!expected || !authHeader?.startsWith('Basic ')) return false
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8')
  return decoded === expected
}

const NAV = [
  { href: '/admin', label: 'Сводка', icon: 'gauge' as const },
  { href: '/admin/bookings', label: 'Брони', icon: 'calendar' as const },
  { href: '/admin/locations', label: 'Точки', icon: 'map' as const },
  { href: '/admin/addresses', label: 'Адреса', icon: 'pin' as const },
  { href: '/admin/blocked-slots', label: 'Блокировки', icon: 'lock' as const },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
      <body className={`${inter.variable} ${barlow.variable} ${mono.variable} admin-shell`}>
        <div className="admin-bg-glow" aria-hidden />
        <div className="admin-grid">
          <aside className="admin-sidebar">
            <Link href="/admin" className="admin-brand">
              <span className="admin-brand-logo">J</span>
              <span className="admin-brand-text">
                <span className="admin-brand-title">JAN-VAPE</span>
                <span className="admin-brand-sub">admin panel</span>
              </span>
            </Link>

            <nav className="admin-nav">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="admin-nav-link">
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="admin-sidebar-footer">
              <div className="admin-status-pill">
                <span className="admin-status-dot" />
                onboarded
              </div>
              <p className="admin-hint">
                Все данные синхронизируются с приложением Vapestore и фронтом jan-vape.com.
              </p>
            </div>
          </aside>
          <main className="admin-main">
            <div className="admin-main-inner">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}

function NavIcon({ name }: { name: 'gauge' | 'calendar' | 'map' | 'pin' | 'lock' }) {
  const stroke = 'currentColor'
  switch (name) {
    case 'gauge':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 14l4-4" />
          <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        </svg>
      )
    case 'calendar':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'map':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 1 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'pin':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      )
    case 'lock':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      )
  }
}
