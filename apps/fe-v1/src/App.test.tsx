import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("@/app/AppProviders", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    default: () => <actual.Outlet />,
  };
});

vi.mock("@/views/MarketsAll", () => ({
  default: () => <div>Markets Dashboard</div>,
}));

vi.mock("@/views/PredictionDashboard", () => ({
  default: () => <div>Prediction Dashboard</div>,
}));

vi.mock("@/views/AboveBelowDashboard", () => ({
  default: () => <div>Above Below Dashboard</div>,
}));

vi.mock("@/views/MarketDetail", () => ({
  default: () => <div>Market Detail</div>,
}));

vi.mock("@/views/Portfolio", () => ({
  default: () => <div>Portfolio</div>,
}));

vi.mock("@/views/Activity", () => ({
  default: () => <div>Activity</div>,
}));

vi.mock("@/views/Leaderboard", () => ({
  default: () => <div>Leaderboard</div>,
}));

vi.mock("@/views/Resolution", () => ({
  default: () => <div>Resolution</div>,
}));

vi.mock("@/views/Login", () => ({
  default: () => <div>Login</div>,
}));

vi.mock("@/views/NotFound", () => ({
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
