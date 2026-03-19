import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import RetroErrorState from "@/components/RetroErrorState";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Index from "./pages/Index";
import PredictionDashboard from "./pages/PredictionDashboard";
import AboveBelowDashboard from "./pages/AboveBelowDashboard";
import MarketDetail from "./pages/MarketDetail";
import MarketsAll from "./pages/MarketsAll";
import Portfolio from "./pages/Portfolio";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import { Web3ModalProvider } from "@/context/Web3ModalProvider";

import { OnboardingProvider } from "@/context/OnboardingContext";

import { LanguageProvider } from "@/context/LanguageContext";
import { MarketProvider } from "@/context/MarketContext";
import { AllMarketsProvider } from "@/context/AllMarketsContext";
import { AssetProvider } from "@/context/AssetContext";
import Activity from "./pages/Activity";
import Leaderboard from "./pages/Leaderboard";
import Resolution from "./pages/Resolution";

const App = () => (
  <Web3ModalProvider>
    <TooltipProvider>
      <LanguageProvider>
        <OnboardingProvider>
          <MarketProvider>
            <AllMarketsProvider>
              <AssetProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <ErrorBoundary fallback={<RetroErrorState onRefresh={() => window.location.reload()} />}>
                  <Routes>
                    {/* Public Landing Page */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Main App Routes */}
                    <Route path="/app" element={<Navigate to="/app/markets/all" replace />} />
                    <Route path="/app/markets/updown" element={<PredictionDashboard />} />
                    <Route path="/app/markets/abovebelow" element={<AboveBelowDashboard />} />
                    <Route path="/app/markets" element={<Index />} />
                    <Route path="/app/markets/all" element={<MarketsAll />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/app/market/:id" element={<MarketDetail />} />
                    <Route path="/app/portfolio" element={<Portfolio />} />
                    <Route path="/app/activity" element={<Activity />} />
                    <Route path="/app/history" element={<Activity />} />
                    <Route path="/app/leaderboard" element={<Leaderboard />} />
                    <Route path="/app/resolution" element={<Resolution />} />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
                </BrowserRouter>
              </AssetProvider>
            </AllMarketsProvider>
          </MarketProvider>
        </OnboardingProvider>
      </LanguageProvider>
    </TooltipProvider>
  </Web3ModalProvider>
);

export default App;
