import Link from 'next/link'
import { MapPin, Send, Sparkles } from 'lucide-react'

const TELEGRAM_URL = 'https://t.me/Jfjfjir93299392992'

export function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`mt-12 border-t border-border-on-dark bg-canvas py-10 ${compact ? 'pb-6 md:pb-10' : 'pb-28 md:pb-12'}`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft via-accent-primary to-accent-ember text-text-on-accent">
                <span className="font-display text-base font-black leading-none">J</span>
              </span>
              <span className="font-display text-xl font-extrabold tracking-[0.18em] text-text-on-dark">
                JAN-VAPE
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
              Жидкости, одноразки, устройства, снюс. Бронирование онлайн, оплата при получении.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-on-dark bg-elevated px-3 py-2 text-xs text-text-muted">
              <MapPin className="h-3.5 w-3.5 text-accent-primary" />
              г. Ивацевичи
            </div>
          </div>

          <FooterCol title="Сервис">
            <FooterLink href="/cart">Корзина</FooterLink>
            <FooterLink href="/checkout">Оформление</FooterLink>
            <FooterLink href="/">Каталог</FooterLink>
            <FooterLink href="/promotions">
              <Sparkles className="h-3.5 w-3.5" />
              Скидки
            </FooterLink>
          </FooterCol>

          <FooterCol title="Контакты">
            <FooterLink href={TELEGRAM_URL} external>
              <Send className="h-3.5 w-3.5" />
              @Jfjfjir93299392992
            </FooterLink>
          </FooterCol>
        </div>

        <div className="mt-6 border-t border-border-on-dark pt-6 text-center text-xs text-text-faint">
          <span>© {new Date().getFullYear()} Jan-Vape · Все права защищены</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 font-display text-xs font-bold tracking-[0.22em] text-text-faint">
        {title.toUpperCase()}
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  const className =
    'inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-accent-soft'

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
