import { Zap, Shield, Heart } from 'lucide-react'
import { HeroScrollHint } from '@/components/layout/HeroScrollHint'

export function HeroSection() {
  return (
    <section className="hero-glow relative mb-4 overflow-hidden rounded-2xl border border-border-on-dark sm:mb-8 sm:rounded-3xl md:mb-12">
      <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-primary/15 blur-3xl sm:-right-20 sm:-top-20 sm:h-80 sm:w-80" />
      <div className="pointer-events-none absolute -bottom-24 -left-8 h-40 w-40 rounded-full bg-accent-mint/10 blur-3xl sm:-bottom-32 sm:h-72 sm:w-72" />

      <div className="relative px-4 py-5 sm:px-8 sm:py-10 lg:py-14">
        <p className="hero-line font-display text-[1.05rem] font-black leading-snug tracking-wide text-text-on-dark md:hidden">
          <span className="text-gradient-accent">ВЫБИРАЙ</span>
          {' · '}
          БРОНИРУЙ
          {' · '}
          ЗАБИРАЙ
        </p>

        <h1 className="hidden font-display font-black tracking-wider text-text-on-dark md:block">
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

        <p className="hero-line mt-3 max-w-xl text-sm text-text-muted sm:mt-5 sm:text-base md:text-lg">
          Жидкости, одноразки, поды и паучи — бронь онлайн, оплата при получении.
        </p>

        <div className="hero-line mt-4 hidden gap-3 sm:grid sm:grid-cols-3">
          <FeatureRow icon={<Zap className="h-4 w-4" />} text="Актуальные остатки в реальном времени" />
          <FeatureRow icon={<Heart className="h-4 w-4" />} text="Подтверждение брони от продавца в Telegram" />
          <FeatureRow icon={<Shield className="h-4 w-4" />} text="Оплата при получении" />
        </div>

        <HeroScrollHint />
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
