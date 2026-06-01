import type { Metadata, Viewport } from 'next'
import { Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['600', '700', '800', '900'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-barlow',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains',
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
  themeColor: '#0B0D10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="bg-[#0B0D10]">
      <body className={`${inter.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
