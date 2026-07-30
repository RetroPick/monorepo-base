import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import RetroErrorState from "@/components/RetroErrorState";
import AppProviders from "@/app/AppProviders";
import Activity from "@/views/Activity";
import AboveBelowDashboard from "@/views/AboveBelowDashboard";
import EventDetailPolymarket from "@/views/EventDetailPolymarket";
import Leaderboard from "@/views/Leaderboard";
import Login from "@/views/Login";
import MarketDetailRouter from "@/views/MarketDetailRouter";
import MarketsAll from "@/views/MarketsAll";
import NotFound from "@/views/NotFound";
import Portfolio from "@/views/Portfolio";
import PredictionDashboard from "@/views/PredictionDashboard";
import Resolution from "@/views/Resolution";
import SignalsPolymarket from "@/views/SignalsPolymarket";

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary
        fallback={<RetroErrorState onRefresh={() => window.location.reload()} />}
      >
        <Routes>
          <Route path="/markets" element={<Navigate to="/app/markets/all" replace />} />
          <Route path="/markets/events/:eventId" element={<Navigate to="/app/events/:eventId" replace />} />
          <Route path="/markets/markets/:marketId" element={<Navigate to="/app/market/:marketId" replace />} />
          <Route path="/markets/signals" element={<Navigate to="/app/signals" replace />} />
          <Route element={<AppProviders />}>
            <Route path="/" element={<Navigate to="/app/markets/all" replace />} />
            <Route path="/app" element={<Navigate to="/app/markets/all" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app/markets/all" element={<MarketsAll />} />
            <Route path="/app/events/:eventId" element={<EventDetailPolymarket />} />
            <Route path="/app/signals" element={<SignalsPolymarket />} />
            <Route path="/app/markets/updown" element={<Navigate to="/app/markets/updown/crypto" replace />} />
            <Route path="/app/markets/abovebelow" element={<Navigate to="/app/markets/abovebelow/crypto" replace />} />
            <Route path="/app/markets/updown/:assetClass" element={<PredictionDashboard />} />
            <Route path="/app/markets/abovebelow/:assetClass" element={<AboveBelowDashboard />} />
            <Route path="/app/market/:id" element={<MarketDetailRouter />} />
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
