import { AlertTriangle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border-on-dark bg-canvas py-8 pb-24 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Age Warning */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-elevated p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-warning" />
          <div>
            <p className="font-display text-sm font-bold tracking-wider text-text-on-dark">
              18+
            </p>
            <p className="text-sm text-text-muted">
              Продажа табачной продукции и никотиносодержащей продукции лицам младше 18 лет запрещена.
              Товары предназначены для совершеннолетних пользователей.
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <div>
            <div className="font-display text-xl font-bold tracking-wider text-text-on-dark">
              Jan-Vape
            </div>
            <div className="text-sm text-text-muted">г. Ивацевичи</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-muted">
            <a href="#" className="hover:text-text-on-dark transition-colors">
              О нас
            </a>
            <a href="#" className="hover:text-text-on-dark transition-colors">
              Контакты
            </a>
            <a href="#" className="hover:text-text-on-dark transition-colors">
              Политика конфиденциальности
            </a>
          </div>
          <div className="text-sm text-text-muted">
            © {new Date().getFullYear()} Jan-Vape
          </div>
        </div>
      </div>
    </footer>
  )
}
