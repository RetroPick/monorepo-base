import "./globals.css";

export const metadata = {
  title: "RetroPick V10 Fullstack Terminal",
  description: "RetroPick 9-market fullstack terminal with Binance display data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
