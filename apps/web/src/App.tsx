import { BrowserRouter, Navigate, useRoutes } from "react-router-dom";

import AppProviders from "@/app/AppProviders";
import { marketsRoutes } from "@/products/markets/routes/marketsRoutes";

function AppRoutes() {
  return useRoutes([
    {
      element: <AppProviders />,
      children: [
        { path: "/", element: <Navigate to="/markets" replace /> },
        ...marketsRoutes,
        { path: "*", element: <Navigate to="/markets" replace /> },
      ],
    },
  ]);
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
