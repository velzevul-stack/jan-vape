import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { StickyCartBar } from '@/components/layout/StickyCartBar'
import { HeroSection } from '@/components/layout/HeroSection'
import { MainWithCartPadding } from '@/components/layout/MainWithCartPadding'
import { PageContainer } from '@/components/layout/PageContainer'
import { CatalogLayout } from '@/components/layout/CatalogLayout'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <MainWithCartPadding>
        <PageContainer maxWidth="catalog" className="lg:max-w-7xl">
          <HeroSection />
          <CatalogLayout />
        </PageContainer>
      </MainWithCartPadding>

      <Footer />
      <StickyCartBar />
    </div>
  )
}
