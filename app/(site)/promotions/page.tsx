import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageContainer } from '@/components/layout/PageContainer'

export default function PromotionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
        <PageContainer maxWidth="cart">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-accent-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад в каталог</span>
          </Link>

          <div className="surface-card mx-auto flex max-w-md flex-col items-center rounded-3xl px-8 py-14 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-mist text-accent-soft">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-[0.2em] text-text-on-dark">
              СКОРО
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Раздел скидок и акций появится здесь. Пока выбирайте из актуального каталога.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-accent-primary px-6 font-display text-sm font-extrabold uppercase tracking-wider text-text-on-accent transition-opacity hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              В каталог
            </Link>
          </div>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
