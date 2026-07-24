import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RetroPick Waitlist | Structured Event Markets",
  description:
    "Join RetroPick for epoch-based event markets with source evidence, paper trading, structured market types, and USDC settlement.",
  icons: {
    icon: "/images/retropick-logo.png",
    apple: "/images/retropick-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
