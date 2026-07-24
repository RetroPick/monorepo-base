import type { RouteObject } from "react-router-dom";

import PrismHomePage from "./PrismHomePage";

export const prismRoutes: RouteObject[] = [
  { path: "/prism", element: <PrismHomePage /> },
  { path: "/prism/*", element: <PrismHomePage /> },
];
