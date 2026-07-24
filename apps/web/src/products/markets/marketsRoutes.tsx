import type { RouteObject } from "react-router-dom";

import MarketsHomePage from "./MarketsHomePage";

export const marketsRoutes: RouteObject[] = [
  { path: "/markets", element: <MarketsHomePage /> },
  { path: "/markets/*", element: <MarketsHomePage /> },
];
