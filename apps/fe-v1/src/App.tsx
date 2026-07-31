import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import RetroErrorState from "@/components/RetroErrorState";
import AppProviders from "@/app/AppProviders";
import EventDetailPolymarket from "@/views/EventDetailPolymarket";
import Login from "@/views/Login";
import MarketDetailPolymarket from "@/views/MarketDetailPolymarket";
import MarketsAll from "@/views/MarketsAll";
import NotFound from "@/views/NotFound";
import PortfolioPlaceholder from "@/views/PortfolioPlaceholder";
import SignalsPolymarket from "@/views/SignalsPolymarket";
import {
  RedirectLegacyEventDetail,
  RedirectLegacyMarketDetail,
} from "@/views/routing/MarketsRedirects";

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary
        fallback={<RetroErrorState onRefresh={() => window.location.reload()} />}
      >
        <Routes>
          <Route path="/markets" element={<Navigate to="/app/markets/all" replace />} />
          <Route path="/markets/events/:eventId" element={<RedirectLegacyEventDetail />} />
          <Route path="/markets/markets/:marketId" element={<RedirectLegacyMarketDetail />} />
          <Route path="/markets/signals" element={<Navigate to="/app/signals" replace />} />
          <Route element={<AppProviders />}>
            <Route path="/" element={<Navigate to="/app/markets/all" replace />} />
            <Route path="/app" element={<Navigate to="/app/markets/all" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app/markets/all" element={<MarketsAll />} />
            <Route path="/app/events/:eventId" element={<EventDetailPolymarket />} />
            <Route path="/app/signals" element={<SignalsPolymarket />} />
            <Route path="/app/market/:id" element={<MarketDetailPolymarket />} />
            <Route path="/app/portfolio" element={<PortfolioPlaceholder />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
