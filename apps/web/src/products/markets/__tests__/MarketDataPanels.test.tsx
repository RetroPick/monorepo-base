import type { MarketHealthSnapshot, PriceHistoryResponse } from "@retropick/polymarket";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MarketHealthPanel, PriceHistoryPanel, RelatedMarketsPanel } from "../components/MarketDataPanels";

const freshness = { state: "fresh" as const, observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 };
const provenance = { source: "polymarket_clob", observedAt: "2026-07-30T12:00:00Z" };

function history(points: PriceHistoryResponse["points"]): PriceHistoryResponse {
  return {
    schemaVersion: "1",
    marketId: "polymarket:market:456",
    tokenId: "token-yes",
    interval: "1d",
    points,
    freshness,
    provenance,
  };
}

const healthWithUnavailablePrices: MarketHealthSnapshot = {
  schemaVersion: "1",
  marketId: "polymarket:market:456",
  algorithm: "depth_v1",
  observedAt: "2026-07-30T12:00:00Z",
  bestBid: null,
  bestAsk: null,
  bidDepth: "100",
  askDepth: "50",
  snapshotAgeMs: 1000,
  crossed: false,
  freshness,
  provenance,
};

describe("MarketDataPanels", () => {
  it("spaces sparse history points by their canonical timestamps", () => {
    render(
      <PriceHistoryPanel
        history={history([
          { timestamp: "2026-07-30T00:00:00Z", price: "0.10", derived: false, source: "polymarket_clob" },
          { timestamp: "2026-07-30T06:00:00Z", price: "0.20", derived: false, source: "polymarket_clob" },
          { timestamp: "2026-07-31T00:00:00Z", price: "0.30", derived: false, source: "polymarket_clob" },
        ])}
      />,
    );

    expect(screen.getByLabelText("Sparse price history chart")).toHaveAttribute("viewBox", "0 0 10000 10000");
    expect(screen.getByLabelText("Sparse price history chart").querySelector("polyline")).toHaveAttribute(
      "points",
      "0,9000 2500,8000 10000,7000",
    );
  });

  it("omits malformed history timestamps instead of plotting or presenting them", () => {
    render(
      <PriceHistoryPanel
        history={history([
          { timestamp: "2026-07-30T00:00:00Z", price: "0.50", derived: false, source: "polymarket_clob" },
          { timestamp: "not-an-iso-timestamp", price: "0.99", derived: false, source: "polymarket_clob" },
        ])}
      />,
    );

    expect(screen.getByLabelText("Sparse price history chart").querySelector("polyline")).toHaveAttribute(
      "points",
      "5000,5000",
    );
    expect(screen.getByText(/latest observed price/i)).toHaveTextContent("0.5");
    expect(screen.queryByText("0.99")).not.toBeInTheDocument();
  });

  it("keeps equal-timestamp observations finite and co-located", () => {
    render(
      <PriceHistoryPanel
        history={history([
          { timestamp: "2026-07-30T00:00:00Z", price: "0.40", derived: false, source: "polymarket_clob" },
          { timestamp: "2026-07-30T00:00:00Z", price: "0.60", derived: false, source: "polymarket_clob" },
        ])}
      />,
    );

    expect(screen.getByLabelText("Sparse price history chart").querySelector("polyline")).toHaveAttribute(
      "points",
      "5000,6000 5000,4000",
    );
  });

  it("renders nullable canonical market-health prices as unavailable", () => {
    render(<MarketHealthPanel health={healthWithUnavailablePrices} />);

    expect(screen.getByRole("region", { name: /market health/i })).toHaveTextContent("Best bid—Best ask—");
  });

  it("makes related-event request failure explicit and retryable", () => {
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <RelatedMarketsPanel currentMarketId="polymarket:market:456" error={new Error("event unavailable")} onRetry={onRetry} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Related markets unavailable");
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
