'use client'

import { useCart } from '@/lib/context/cart-context'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CartSidebar } from '@/components/layout/StickyCartBar'

export function CatalogLayout() {
  const { totalItems } = useCart()

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <ProductGrid />

      {totalItems > 0 && (
        <aside className="hidden lg:block">
          <div className="sticky top-[4.5rem] z-30">
            <CartSidebar />
          </div>
        </aside>
      )}
    </div>
  )
}
