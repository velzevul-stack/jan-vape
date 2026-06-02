import { cn } from '@/lib/utils'

type PageContainerMaxWidth = 'catalog' | 'checkout' | 'cart' | 'narrow'

const maxWidthClasses: Record<PageContainerMaxWidth, string> = {
  catalog: 'max-w-lg lg:max-w-none',
  checkout: 'max-w-lg lg:max-w-4xl',
  cart: 'max-w-lg lg:max-w-3xl',
  narrow: 'max-w-lg lg:max-w-2xl',
}

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: PageContainerMaxWidth
  /** On desktop, align with catalog grid (no extra centering inside lg grid). */
  alignWithCatalog?: boolean
}

export function PageContainer({
  children,
  className,
  maxWidth = 'catalog',
  alignWithCatalog = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full min-w-0',
        maxWidthClasses[maxWidth],
        !alignWithCatalog && 'lg:mx-auto',
        alignWithCatalog && 'lg:mx-0',
        className
      )}
    >
      {children}
    </div>
  )
}
