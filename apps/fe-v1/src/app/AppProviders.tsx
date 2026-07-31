import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { useState } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3ModalProvider } from "@/context/Web3ModalProvider";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { MarketProvider } from "@/context/MarketContext";
import { AllMarketsProvider } from "@/context/AllMarketsContext";
import { AssetProvider } from "@/context/AssetContext";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (failureCount >= 3) return false;
          const code = (error as { code?: string })?.code;
          if (code === "not_found" || code === "validation" || code === "aborted") return false;
          return true;
        },
        retryDelay: (attempt) => Math.min(30_000, 1000 * 2 ** attempt + Math.random() * 500),
      },
    },
  });
}

export default function AppProviders() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <Web3ModalProvider>
          <TooltipProvider>
            <LanguageProvider>
              <OnboardingProvider>
                <MarketProvider>
                  <AllMarketsProvider>
                    <AssetProvider>
                      <Toaster />
                      <Sonner />
                      <Outlet />
                    </AssetProvider>
                  </AllMarketsProvider>
                </MarketProvider>
              </OnboardingProvider>
            </LanguageProvider>
          </TooltipProvider>
        </Web3ModalProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
