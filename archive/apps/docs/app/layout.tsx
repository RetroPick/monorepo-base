import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RetroPick Docs",
    template: "%s · RetroPick Docs",
  },
  description:
    "Documentation for RetroPick prediction markets—how markets work, market types, wallets, and settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
