import { cn } from '@/lib/utils'
import type { Product } from '@/lib/mock-data'

type CartProductLinesProps = {
  product: Product
  quantity?: number
  brandClassName?: string
  flavorClassName?: string
  layout?: 'stack' | 'inline'
}

export function CartProductLines({
  product,
  quantity,
  brandClassName,
  flavorClassName,
  layout = 'stack',
}: CartProductLinesProps) {
  const flavor = product.flavor?.trim()

  if (layout === 'inline') {
    return (
      <span className={cn('min-w-0 text-text-on-dark', brandClassName)}>
        <span className="font-medium">{product.brand}</span>
        {flavor && (
          <span className="text-text-muted">
            {' · '}
            {flavor}
          </span>
        )}
        {quantity != null && (
          <span className="text-text-muted"> × {quantity}</span>
        )}
      </span>
    )
  }

  return (
    <div className="min-w-0">
      <div className={cn('truncate font-semibold text-text-on-dark', brandClassName)}>
        {product.brand}
        {quantity != null && (
          <span className="font-normal text-text-muted"> × {quantity}</span>
        )}
      </div>
      {flavor && (
        <div className={cn('line-clamp-2 text-text-muted', flavorClassName ?? 'text-xs')}>
          {flavor}
        </div>
      )}
    </div>
  )
}
