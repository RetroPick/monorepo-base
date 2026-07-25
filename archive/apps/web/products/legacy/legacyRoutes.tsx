import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const MarketsAll = lazy(() => import("@/views/MarketsAll"));
const Activity = lazy(() => import("@/views/Activity"));
const Leaderboard = lazy(() => import("@/views/Leaderboard"));
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

/** Epoch MarketEngine routes — frozen under /app/* */
export const legacyRoutes: RouteObject[] = [
  { path: "/", element: <Navigate to="/app/markets/all" replace /> },
  { path: "/app", element: <Navigate to="/app/markets/all" replace /> },
  { path: "/login", element: <Navigate to="/app/markets/all" replace /> },
  { path: "/app/markets/all", element: <MarketsAll /> },
  { path: "/app/markets/updown", element: <Navigate to="/app/markets/all" replace /> },
  { path: "/app/markets/abovebelow", element: <Navigate to="/app/markets/all" replace /> },
  { path: "/app/markets/updown/:assetClass", element: <Navigate to="/app/markets/all" replace /> },
  { path: "/app/markets/abovebelow/:assetClass", element: <Navigate to="/app/markets/all" replace /> },
  { path: "/app/market/:templateId", element: <ChainMarketDetail /> },
  { path: "/app/terms", element: <LegalDocumentPage kind="terms" /> },
  { path: "/app/privacy", element: <LegalDocumentPage kind="privacy" /> },
  { path: "/app/portfolio", element: <Portfolio /> },
  { path: "/app/activity", element: <Activity /> },
  { path: "/app/leaderboard", element: <Leaderboard /> },
  { path: "/app/resolution", element: <Resolution /> },
  { path: "/app/chain-markets", element: <ChainMarkets /> },
  { path: "/app/chain-markets/:templateId", element: <ChainMarketDetail /> },
  {
    path: "/app/world-cup",
    element: <WorldCupHubPage />,
    children: [
      { index: true, element: <Navigate to="group-stage" replace /> },
      { path: "group-stage", element: <WorldCupGroupStage /> },
      { path: "round-of-32", element: <WorldCupRoundOf32 /> },
      { path: "quarter-final", element: <WorldCupQuarterFinal /> },
      { path: "winner", element: <WorldCupWinner /> },
      { path: "bracket", element: <WorldCupBracketPage /> },
      { path: "stats", element: <WorldCupStatsInfoPage /> },
    ],
  },
  { path: "/app/gooddollar", element: <GoodDollarHubPage /> },
  { path: "/app/gooddollar/daily", element: <DailyMarketPage /> },
  { path: "/app/gooddollar/my-g", element: <GoodDollarMyGPage /> },
  { path: "/app/gooddollar/rewards", element: <GoodDollarRewardsPage /> },
  { path: "/app/gooddollar/invite", element: <InvitePage /> },
  { path: "/app/gooddollar/learn", element: <LearnPage /> },
  { path: "/app/gooddollar/impact", element: <ImpactDashboardPage /> },
];
