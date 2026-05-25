import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Barlow_Condensed } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/context/cart-context'
import { BookingProvider } from '@/lib/context/booking-context'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({ 
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Jan-Vape — Бронирование | Ивацевичи',
  description: 'Jan-Vape: выберите товары и забронируйте для получения в магазине в Ивацевичах. Без предоплаты.',
  keywords: ['Jan-Vape', 'vape', 'вейп', 'Ивацевичи', 'жидкости', 'снюс', 'бронирование', 'самовывоз'],
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="bg-[#121212]">
      <body className={`${inter.variable} ${barlowCondensed.variable} font-sans antialiased min-h-screen`}>
        <CartProvider>
          <BookingProvider>
            {children}
          </BookingProvider>
        </CartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
