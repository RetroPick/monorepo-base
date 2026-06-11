import { Outlet } from "react-router-dom";

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

export default function AppProviders() {
  return (
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
  );
}
