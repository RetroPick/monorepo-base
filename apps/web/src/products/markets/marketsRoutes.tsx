import type { RouteObject } from "react-router-dom";

import MarketsDiscoveryPage from "./pages/MarketsDiscoveryPage";
import EventDetailPage from "./pages/EventDetailPage";
import MarketDetailPage from "./pages/MarketDetailPage";
import SignalsPage from "./pages/SignalsPage";

export const marketsRoutes: RouteObject[] = [
  { path: "/markets", element: <MarketsDiscoveryPage /> },
  { path: "/markets/events/:eventId", element: <EventDetailPage /> },
  { path: "/markets/markets/:marketId", element: <MarketDetailPage /> },
  { path: "/markets/signals", element: <SignalsPage /> },
  { path: "/markets/*", element: <MarketsDiscoveryPage /> },
];
