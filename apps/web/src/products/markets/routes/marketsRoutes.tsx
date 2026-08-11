import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

import EventDetailPage from "../pages/EventDetailPage";
import EventsDiscoverPage from "../pages/EventsDiscoverPage";
import FollowingPage from "../pages/FollowingPage";
import IntelligenceHubPage from "../pages/IntelligenceHubPage";
import MarketDetailPage from "../pages/MarketDetailPage";
import PaperPortfolioPage from "../pages/PaperPortfolioPage";
import PortfolioPage from "../pages/PortfolioPage";
import SmartMoneyPage from "../pages/SmartMoneyPage";
import WalletProfilePage from "../pages/WalletProfilePage";
import { FundingPage } from "../funding/pages/FundingPage";
import { WalletConnectPage } from "../wallet/pages/WalletConnectPage";

export const marketsRoutes: RouteObject[] = [
  { path: "/markets", element: <EventsDiscoverPage /> },
  { path: "/markets/search", element: <Navigate to="/markets" replace /> },
  { path: "/markets/wallet", element: <WalletConnectPage /> },
  { path: "/markets/funding", element: <FundingPage /> },
  { path: "/markets/intelligence", element: <IntelligenceHubPage /> },
  { path: "/markets/intelligence/smart-money", element: <SmartMoneyPage /> },
  { path: "/markets/intelligence/following", element: <FollowingPage /> },
  { path: "/markets/intelligence/paper", element: <PaperPortfolioPage /> },
  { path: "/markets/wallets/:address", element: <WalletProfilePage /> },
  { path: "/markets/events/:eventId", element: <EventDetailPage /> },
  { path: "/markets/m/:marketId", element: <MarketDetailPage /> },
  { path: "/markets/portfolio", element: <PortfolioPage /> },
];

export default marketsRoutes;
