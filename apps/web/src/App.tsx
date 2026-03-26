import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
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
        fallback={
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="max-w-md text-center text-muted-foreground">
              An unexpected error occurred. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Refresh page
            </button>
          </div>
        }
      >
        <Routes>
          <Route element={<AppProviders />}>
            <Route path="/" element={<Navigate to="/app/markets/all" replace />} />
            <Route path="/app" element={<Navigate to="/app/markets/all" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app/markets/all" element={<MarketsAll />} />
            <Route path="/app/markets/updown" element={<PredictionDashboard />} />
            <Route path="/app/markets/abovebelow" element={<AboveBelowDashboard />} />
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
