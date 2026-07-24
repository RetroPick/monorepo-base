import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("@/app/AppProviders", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    default: () => <actual.Outlet />,
  };
});

vi.mock("@/pages/MarketsAll", () => ({
  default: () => <div>Markets Dashboard</div>,
}));

vi.mock("@/pages/PredictionDashboard", () => ({
  default: () => <div>Prediction Dashboard</div>,
}));

vi.mock("@/pages/AboveBelowDashboard", () => ({
  default: () => <div>Above Below Dashboard</div>,
}));

vi.mock("@/pages/MarketDetail", () => ({
  default: () => <div>Market Detail</div>,
}));

vi.mock("@/pages/Portfolio", () => ({
  default: () => <div>Portfolio</div>,
}));

vi.mock("@/pages/Activity", () => ({
  default: () => <div>Activity</div>,
}));

vi.mock("@/pages/Leaderboard", () => ({
  default: () => <div>Leaderboard</div>,
}));

vi.mock("@/pages/Resolution", () => ({
  default: () => <div>Resolution</div>,
}));

vi.mock("@/pages/Login", () => ({
  default: () => <div>Login</div>,
}));

vi.mock("@/pages/NotFound", () => ({
  default: () => <div>Not Found</div>,
}));

describe("App routing", () => {
  it("redirects the root path to the markets dashboard", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(await screen.findByText("Markets Dashboard")).toBeInTheDocument();
  });

  it("renders the up/down trading dashboard route with asset class segment", async () => {
    window.history.pushState({}, "", "/app/markets/updown/crypto");

    render(<App />);

    expect(await screen.findByText("Prediction Dashboard")).toBeInTheDocument();
  });
});
