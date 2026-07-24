import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: "RetroPick Waitlist | Trade Markets Never Existed Onchain",
  description:
    "Hedge exposure across 68+ deterministic markets. 100% deterministic, zero disputes, instant settlement. Earn up to 4% APY.",
  generator: "v0.app",
  icons: {
    icon: "/retropick-logo.png",
    apple: "/retropick-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-[#0a0f2e]">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
