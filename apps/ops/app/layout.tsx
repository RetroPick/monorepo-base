import type { Metadata } from "next";

import { LiveOpsProvider } from "@/components/LiveOpsContext";
import { OpsBanners } from "@/components/OpsBanners";
import { OpsHeader } from "@/components/OpsHeader";
import { OpsLiveBanners } from "@/components/OpsLiveBanners";
import { OpsLiveToolbar } from "@/components/OpsLiveToolbar";
import { fetchGlobalState } from "@/lib/api";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RetroPick · Operator",
  description: "Internal operator dashboard (indexed projections)",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let globalState: Awaited<ReturnType<typeof fetchGlobalState>> | null = null;
  let apiError = false;
  try {
    globalState = await fetchGlobalState();
  } catch {
    apiError = true;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Providers>
          <LiveOpsProvider>
            <OpsHeader globalState={globalState} />
            <OpsLiveToolbar />
            <OpsLiveBanners />
            <OpsBanners globalState={globalState} apiError={apiError} />
            <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
          </LiveOpsProvider>
        </Providers>
      </body>
    </html>
  );
}
