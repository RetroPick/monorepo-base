import { lazy, Suspense, useMemo } from "react";
import { BrowserRouter, Navigate, RouteObject, useRoutes } from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import RetroErrorState from "@/components/RetroErrorState";
import RouteFallback from "@/components/RouteFallback";
import AppProviders from "@/app/AppProviders";
import {
  getProductMode,
  isLegacyEnabled,
  isMarketsEnabled,
  isPrismEnabled,
} from "@/config/product";
import { legacyRoutes } from "@/products/legacy/legacyRoutes";
import { marketsRoutes } from "@/products/markets/marketsRoutes";
import { prismRoutes } from "@/products/prism/prismRoutes";
import ProductNotFound from "@/products/shared/ProductNotFound";

const LegacyCatchAllNotFound = lazy(() => import("@/views/NotFound"));

function AppRoutes() {
  const mode = getProductMode();
  const showLegacy = isLegacyEnabled(mode);
  const showMarkets = isMarketsEnabled(mode);
  const showPrism = isPrismEnabled(mode);
  const singleProduct = mode === "markets" || mode === "prism";

  const routes = useMemo((): RouteObject[] => {
    const children: RouteObject[] = [];

    if (mode === "markets") {
      children.push({ path: "/", element: <Navigate to="/markets" replace /> });
    }
    if (mode === "prism") {
      children.push({ path: "/", element: <Navigate to="/prism" replace /> });
    }
    if (showMarkets) children.push(...marketsRoutes);
    if (showPrism) children.push(...prismRoutes);
    if (showLegacy) children.push(...legacyRoutes);

    children.push({
      path: "*",
      element: singleProduct ? <ProductNotFound /> : <LegacyCatchAllNotFound />,
    });

    return [{ element: <AppProviders />, children }];
  }, [mode, showLegacy, showMarkets, showPrism, singleProduct]);

  return useRoutes(routes);
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary
        fallback={<RetroErrorState onRefresh={() => window.location.reload()} />}
      >
        <Suspense fallback={<RouteFallback />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
