'use client'

import { cn } from '@/lib/utils'
import { useCart } from '@/lib/context/cart-context'

export function MainWithCartPadding({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { totalItems } = useCart()

  return (
    <main
      className={cn(
        'flex-1 px-4 py-6 md:px-6 md:py-8',
        totalItems > 0 && 'pb-24 lg:pb-8',
        className
      )}
    >
      {children}
    </main>
  )
}
