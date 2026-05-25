import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/context/cart-context'
import { BookingProvider } from '@/lib/context/booking-context'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <BookingProvider>
        {children}
      </BookingProvider>
      {process.env.NODE_ENV === 'production' && <Analytics />}
    </CartProvider>
  )
}
