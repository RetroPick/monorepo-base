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

vi.mock("@/views/ChainMarkets", () => ({
  default: () => <div>Chain Markets</div>,
}));

vi.mock("@/views/ChainMarketDetail", () => ({
  default: () => <div>Chain Market Detail</div>,
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

  it("redirects the old up/down mock route to indexed markets", async () => {
    window.history.pushState({}, "", "/app/markets/updown/crypto");

    render(<App />);

    expect(await screen.findByText("Markets Dashboard")).toBeInTheDocument();
  });

  it("renders indexed market detail at the canonical market route", async () => {
    window.history.pushState({}, "", "/app/market/0xabc");

    render(<App />);

    expect(await screen.findByText("Chain Market Detail")).toBeInTheDocument();
  });
});
