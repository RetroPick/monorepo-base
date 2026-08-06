import type { Metadata, Viewport } from 'next'
import { Sora, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RetroPick — Trade. Forecast. Hedge.',
  description:
    'RetroPick is a premium prediction market platform for real-world events. Trade Yes or No on crypto, politics, sports and more.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RetroPick',
  },
}

export const viewport: Viewport = {
  themeColor: '#0E131F',
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
