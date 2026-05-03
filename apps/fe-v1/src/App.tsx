import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import RetroErrorState from "@/components/RetroErrorState";
import AppProviders from "@/app/AppProviders";
import Activity from "@/views/Activity";
import Leaderboard from "@/views/Leaderboard";
import MarketsAll from "@/views/MarketsAll";
import NotFound from "@/views/NotFound";
import Portfolio from "@/views/Portfolio";
import Resolution from "@/views/Resolution";
import ChainMarkets from "@/views/ChainMarkets";
import ChainMarketDetail from "@/views/ChainMarketDetail";
import LegalDocumentPage from "@/views/LegalDocumentPage";

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary
        fallback={<RetroErrorState onRefresh={() => window.location.reload()} />}
      >
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
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
