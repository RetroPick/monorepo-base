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
const WorldCupHubPage = lazy(() => import("@/features/world-cup/pages/WorldCupHubPage"));
const WorldCupGroupStage = lazy(() => import("@/features/world-cup/pages/WorldCupGroupStage"));
const WorldCupRoundOf32 = lazy(() => import("@/features/world-cup/pages/WorldCupRoundOf32"));
const WorldCupQuarterFinal = lazy(() => import("@/features/world-cup/pages/WorldCupQuarterFinal"));
const WorldCupWinner = lazy(() => import("@/features/world-cup/pages/WorldCupWinner"));
const WorldCupBracketPage = lazy(() => import("@/features/world-cup/pages/WorldCupBracketPage"));
const WorldCupStatsInfoPage = lazy(() => import("@/features/world-cup/pages/WorldCupStatsInfoPage"));
const GoodDollarHubPage = lazy(() => import("@/features/gooddollar/GoodDollarHubPage"));
const DailyMarketPage = lazy(() => import("@/features/daily-market/DailyMarketPage"));
const GoodDollarRewardsPage = lazy(() => import("@/features/rewards/RewardsPage"));
const InvitePage = lazy(() => import("@/features/referrals/InvitePage"));
const LearnPage = lazy(() => import("@/features/learn/LearnPage"));
const ImpactDashboardPage = lazy(() => import("@/features/impact/ImpactDashboardPage"));
const GoodDollarMyGPage = lazy(() => import("@/features/gooddollar/GoodDollarMyGPage"));

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
              <Route path="/app/world-cup" element={<WorldCupHubPage />}>
                <Route index element={<Navigate to="group-stage" replace />} />
                <Route path="group-stage" element={<WorldCupGroupStage />} />
                <Route path="round-of-32" element={<WorldCupRoundOf32 />} />
                <Route path="quarter-final" element={<WorldCupQuarterFinal />} />
                <Route path="winner" element={<WorldCupWinner />} />
                <Route path="bracket" element={<WorldCupBracketPage />} />
                <Route path="stats" element={<WorldCupStatsInfoPage />} />
              </Route>
              <Route path="/app/gooddollar" element={<GoodDollarHubPage />} />
              <Route path="/app/gooddollar/daily" element={<DailyMarketPage />} />
              <Route path="/app/gooddollar/my-g" element={<GoodDollarMyGPage />} />
              <Route path="/app/gooddollar/rewards" element={<GoodDollarRewardsPage />} />
              <Route path="/app/gooddollar/invite" element={<InvitePage />} />
              <Route path="/app/gooddollar/learn" element={<LearnPage />} />
              <Route path="/app/gooddollar/impact" element={<ImpactDashboardPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
