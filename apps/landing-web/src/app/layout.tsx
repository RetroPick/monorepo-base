import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RetroPick Waitlist | Structured Event Markets",
  description:
    "Join RetroPick for Polymarket-native prediction markets with source evidence, portfolio tools, and structured market types.",
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
