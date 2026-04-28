import type { Metadata } from "next";

import "../src/index.css";

export const metadata: Metadata = {
  title: "RetroPick",
  description: "Prediction markets on Base Sepolia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
