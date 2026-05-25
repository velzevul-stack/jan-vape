import Link from 'next/link'
import { AlertTriangle, MapPin, Send, Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative mt-12 border-t border-border-on-dark bg-canvas py-10 pb-28 md:pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
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
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border-on-dark bg-elevated px-3 py-2 text-xs text-text-muted">
              <MapPin className="h-3.5 w-3.5 text-accent-primary" />
              г. Ивацевичи
            </div>
          </div>

          <FooterCol title="Сервис">
            <FooterLink href="/cart">Корзина</FooterLink>
            <FooterLink href="/checkout">Оформление</FooterLink>
            <FooterLink href="/">Каталог</FooterLink>
          </FooterCol>

          <FooterCol title="Информация">
            <FooterLink href="#">О нас</FooterLink>
            <FooterLink href="#">Контакты</FooterLink>
            <FooterLink href="#">Политика конфиденциальности</FooterLink>
          </FooterCol>

          <FooterCol title="Связь">
            <FooterLink href="#">
              <Send className="h-3.5 w-3.5" />
              Telegram канал
            </FooterLink>
            <FooterLink href="#">
              <Sparkles className="h-3.5 w-3.5" />
              Акции
            </FooterLink>
          </FooterCol>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-status-warning/20 bg-status-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" />
          <div>
            <p className="font-display text-sm font-extrabold tracking-wider text-text-on-dark">
              18+
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              Продажа никотиносодержащей и табачной продукции лицам младше 18 лет запрещена.
              Товары предназначены для совершеннолетних пользователей.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-border-on-dark pt-6 text-xs text-text-faint md:flex-row">
          <span>© {new Date().getFullYear()} Jan-Vape · Все права защищены</span>
          <span className="font-mono uppercase tracking-[0.2em]">Сделано в Беларуси</span>
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

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-accent-soft"
    >
      {children}
    </Link>
  )
}
