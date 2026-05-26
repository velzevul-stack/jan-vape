import { Zap, Shield, Heart } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="hero-glow relative mb-8 overflow-hidden rounded-3xl border border-border-on-dark md:mb-12">
      <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-accent-mint/10 blur-3xl" />

      <div className="relative px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
        <h1 className="font-display font-black tracking-wider text-text-on-dark">
          <span className="hero-line block text-4xl leading-[0.95] sm:text-5xl lg:text-7xl">
            ВЫБИРАЙ
          </span>
          <span className="hero-line block text-4xl leading-[0.95] sm:text-5xl lg:text-7xl">
            <span className="text-gradient-accent">БРОНИРУЙ</span>
          </span>
          <span className="hero-line block text-4xl leading-[0.95] sm:text-5xl lg:text-7xl">
            ЗАБИРАЙ
          </span>
        </h1>

        <p className="hero-line mt-5 max-w-xl text-base text-text-muted sm:text-lg">
          Жидкости, одноразки, поды, устройства и снюс — собираете заказ онлайн, забираете в магазине.
          <span className="text-text-on-dark"> Без предоплаты.</span>
        </p>

        <div className="hero-line mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FeatureRow icon={<Zap className="h-4 w-4" />} text="Актуальные остатки в реальном времени" />
          <FeatureRow icon={<Heart className="h-4 w-4" />} text="Подтверждение брони от продавца в Telegram" />
          <FeatureRow icon={<Shield className="h-4 w-4" />} text="Оплата при получении" />
        </div>

        <div
          className="hero-line divider-accent mt-8 w-full max-w-md"
          aria-hidden
        />
      </div>
    </section>
  )
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border-on-dark bg-elevated/60 px-3 py-2.5 backdrop-blur-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-mist text-accent-soft">
        {icon}
      </span>
      <span className="text-xs text-text-on-dark sm:text-sm">{text}</span>
    </div>
  )
}
