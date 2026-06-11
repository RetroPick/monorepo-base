import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import RetroErrorState from "@/components/RetroErrorState";
import AppProviders from "@/app/AppProviders";
import Activity from "@/pages/Activity";
import AboveBelowDashboard from "@/pages/AboveBelowDashboard";
import Leaderboard from "@/pages/Leaderboard";
import Login from "@/pages/Login";
import MarketDetail from "@/pages/MarketDetail";
import MarketsAll from "@/pages/MarketsAll";
import NotFound from "@/pages/NotFound";
import Portfolio from "@/pages/Portfolio";
import PredictionDashboard from "@/pages/PredictionDashboard";
import Resolution from "@/pages/Resolution";

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
            <Route path="/login" element={<Login />} />
            <Route path="/app/markets/all" element={<MarketsAll />} />
            <Route path="/app/markets/updown" element={<Navigate to="/app/markets/updown/crypto" replace />} />
            <Route path="/app/markets/abovebelow" element={<Navigate to="/app/markets/abovebelow/crypto" replace />} />
            <Route path="/app/markets/updown/:assetClass" element={<PredictionDashboard />} />
            <Route path="/app/markets/abovebelow/:assetClass" element={<AboveBelowDashboard />} />
            <Route path="/app/market/:id" element={<MarketDetail />} />
            <Route path="/app/portfolio" element={<Portfolio />} />
            <Route path="/app/activity" element={<Activity />} />
            <Route path="/app/leaderboard" element={<Leaderboard />} />
            <Route path="/app/resolution" element={<Resolution />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
