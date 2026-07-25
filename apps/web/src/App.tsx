import { useMemo } from "react";
import { BrowserRouter, Navigate, RouteObject, useRoutes } from "react-router-dom";

import AppProviders from "@/app/AppProviders";
import { getProductMode, isMarketsEnabled, isPrismEnabled } from "@/config/product";
import { marketsRoutes } from "@/products/markets/marketsRoutes";
import { prismRoutes } from "@/products/prism/prismRoutes";
import ProductNotFound from "@/products/shared/ProductNotFound";

function AppRoutes() {
  const mode = getProductMode();
  const routes = useMemo((): RouteObject[] => {
    const children: RouteObject[] = [];

    if (isMarketsEnabled(mode)) {
      children.push({ path: "/", element: <Navigate to="/markets" replace /> });
      children.push(...marketsRoutes);
    }
    if (isPrismEnabled(mode)) {
      if (!isMarketsEnabled(mode)) {
        children.push({ path: "/", element: <Navigate to="/prism" replace /> });
      }
      children.push(...prismRoutes);
    }

    children.push({ path: "*", element: <ProductNotFound /> });
    return [{ element: <AppProviders />, children }];
  }, [mode]);

  return useRoutes(routes);
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
