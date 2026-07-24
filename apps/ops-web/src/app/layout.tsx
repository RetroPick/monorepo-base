import type { Metadata } from "next";

import { OpsAppShell } from "@/components/shell/OpsAppShell";
import { ThemeProvider } from "@/components/theme-provider";
import { LiveOpsProvider } from "@/components/LiveOpsContext";
import { fetchGlobalState } from "@/lib/api";
import "@/styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RetroPick · Operator",
  description: "Internal operator dashboard — indexer + live RPC + calldata prepare",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[color:var(--color-secondaryBg)] antialiased">
        <ThemeProvider>
          <Providers>
            <LiveOpsProvider>
              <OpsAppShell globalState={globalState} apiError={apiError}>
                {children}
              </OpsAppShell>
            </LiveOpsProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
