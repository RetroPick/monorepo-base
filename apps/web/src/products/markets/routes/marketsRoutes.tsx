import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

import EventDetailPage from "../pages/EventDetailPage";
import EventsDiscoverPage from "../pages/EventsDiscoverPage";
import MarketDetailPage from "../pages/MarketDetailPage";

/** Phase-1 read routes for future App Router / shell integration (PHASE-6). */
export const marketsRoutes: RouteObject[] = [
  {
    path: "/markets",
    children: [
      { index: true, element: <EventsDiscoverPage /> },
      { path: "search", element: <Navigate to="/markets" replace /> },
      { path: "events/:eventId", element: <EventDetailPage /> },
      { path: "m/:marketId", element: <MarketDetailPage /> },
    ],
  },
];

export default marketsRoutes;
