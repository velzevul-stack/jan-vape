export function HeroSection() {
  return (
    <section className="hero-glow relative mb-8 overflow-hidden rounded-3xl border border-border-on-dark md:mb-12">
      <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative px-5 py-8 text-center sm:px-8 sm:py-10 lg:py-12 lg:text-left">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          <span className="inline-flex items-center rounded-full bg-accent-primary px-3 py-1 font-display text-xs font-bold tracking-widest text-text-on-accent">
            Jan-Vape
          </span>
          <span className="inline-flex items-center rounded-full border border-border-on-dark bg-elevated/80 px-3 py-1 text-xs font-medium text-text-muted">
            г. Ивацевичи
          </span>
        </div>

        <h1 className="font-display font-extrabold tracking-wider text-text-on-dark">
          <span className="hero-line block text-3xl sm:text-4xl lg:text-6xl">ВЫБИРАЙ</span>
          <span className="hero-line block text-3xl text-accent-primary sm:text-4xl lg:text-6xl">
            БРОНИРУЙ
          </span>
          <span className="hero-line block text-3xl sm:text-4xl lg:text-6xl">ЗАБИРАЙ</span>
        </h1>

        <p className="hero-line mx-auto mt-4 max-w-lg text-base text-text-muted sm:text-lg lg:mx-0">
          Выберите товары и забронируйте для получения в магазине. Без предоплаты — оплата при
          получении.
        </p>

        <div
          className="hero-line mx-auto mt-6 h-px w-full max-w-xs bg-gradient-to-r from-accent-primary via-accent-primary/40 to-transparent lg:mx-0 lg:max-w-md"
          aria-hidden
        />
      </div>
    </section>
  )
}
