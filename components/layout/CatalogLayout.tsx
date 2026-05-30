'use client'

import { useCallback, useState } from 'react'
import { useCart } from '@/lib/context/cart-context'
import { useCatalog } from '@/lib/api/hooks/useCatalog'
import type { ProductCategory } from '@/lib/mock-data'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CategorySidebar } from '@/components/catalog/CategorySidebar'
import { CartSidebar } from '@/components/layout/StickyCartBar'

export type ActiveCategory = ProductCategory | 'all'

export function CatalogLayout() {
  const { totalItems } = useCart()
  const { products, strengthValues, isLoading } = useCatalog()

  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('all')
  const [activeBrand, setActiveBrand] = useState<string | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)

  const handleSelectAll = useCallback(() => {
    setActiveCategory('all')
    setActiveBrand(null)
  }, [])

  const handleSelectCategory = useCallback((category: ProductCategory) => {
    setActiveCategory(category)
    setActiveBrand(null)
  }, [])

  const handleSelectBrand = useCallback((category: ProductCategory, brand: string) => {
    setActiveCategory(category)
    setActiveBrand(brand)
  }, [])

  const showCart = totalItems > 0

  return (
    <div
      className={
        showCart
          ? 'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)_18rem] lg:items-start lg:gap-6 xl:grid-cols-[17rem_minmax(0,1fr)_20rem] xl:gap-8'
          : 'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-8'
      }
    >
      <CategorySidebar
        products={products}
        activeCategory={activeCategory}
        activeBrand={activeBrand}
        onSelectAll={handleSelectAll}
        onSelectCategory={handleSelectCategory}
        onSelectBrand={handleSelectBrand}
        mobileOpen={catalogOpen}
        onMobileOpenChange={setCatalogOpen}
      />

      <ProductGrid
        products={products}
        isLoading={isLoading}
        strengthValues={strengthValues}
        activeCategory={activeCategory}
        activeBrand={activeBrand}
        onSelectAll={handleSelectAll}
        onSelectCategory={handleSelectCategory}
        onSelectBrand={handleSelectBrand}
        onOpenCatalog={() => setCatalogOpen(true)}
      />

      {showCart && (
        <aside className="hidden lg:block">
          <div className="sticky top-[5.25rem] z-30">
            <CartSidebar />
          </div>
        </aside>
      )}
    </div>
  )
}
