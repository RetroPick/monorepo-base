"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { useState } from "react";

import { MarketsWalletProvider } from "@/products/markets/wallet";
import { ThemeProvider } from "@/shared/providers/theme-provider";

export default function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider defaultTheme="system" storageKey="retropick-markets-theme">
      <QueryClientProvider client={queryClient}>
        <MarketsWalletProvider>
          <Outlet />
        </MarketsWalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
