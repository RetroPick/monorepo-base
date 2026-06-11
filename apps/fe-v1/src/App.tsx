import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import RetroErrorState from "@/components/RetroErrorState";
import RouteFallback from "@/components/RouteFallback";
import AppProviders from "@/app/AppProviders";

/** Default landing route — separate chunk so initial parse stays smaller (Phase 3 perf). */
const MarketsAll = lazy(() => import("@/views/MarketsAll"));

const Activity = lazy(() => import("@/views/Activity"));
const Leaderboard = lazy(() => import("@/views/Leaderboard"));
const NotFound = lazy(() => import("@/views/NotFound"));
const Portfolio = lazy(() => import("@/views/Portfolio"));
const Resolution = lazy(() => import("@/views/Resolution"));
const ChainMarkets = lazy(() => import("@/views/ChainMarkets"));
const ChainMarketDetail = lazy(() => import("@/views/ChainMarketDetail"));
const LegalDocumentPage = lazy(() => import("@/views/LegalDocumentPage"));

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary
        fallback={<RetroErrorState onRefresh={() => window.location.reload()} />}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppProviders />}>
              <Route path="/" element={<Navigate to="/app/markets/all" replace />} />
              <Route path="/app" element={<Navigate to="/app/markets/all" replace />} />
              <Route path="/login" element={<Navigate to="/app/markets/all" replace />} />
              <Route path="/app/markets/all" element={<MarketsAll />} />
              <Route path="/app/markets/updown" element={<Navigate to="/app/markets/all" replace />} />
              <Route path="/app/markets/abovebelow" element={<Navigate to="/app/markets/all" replace />} />
              <Route path="/app/markets/updown/:assetClass" element={<Navigate to="/app/markets/all" replace />} />
              <Route path="/app/markets/abovebelow/:assetClass" element={<Navigate to="/app/markets/all" replace />} />
              <Route path="/app/market/:templateId" element={<ChainMarketDetail />} />
              <Route path="/app/terms" element={<LegalDocumentPage kind="terms" />} />
              <Route path="/app/privacy" element={<LegalDocumentPage kind="privacy" />} />
              <Route path="/app/portfolio" element={<Portfolio />} />
              <Route path="/app/activity" element={<Activity />} />
              <Route path="/app/leaderboard" element={<Leaderboard />} />
              <Route path="/app/resolution" element={<Resolution />} />
              <Route path="/app/chain-markets" element={<ChainMarkets />} />
              <Route path="/app/chain-markets/:templateId" element={<ChainMarketDetail />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
