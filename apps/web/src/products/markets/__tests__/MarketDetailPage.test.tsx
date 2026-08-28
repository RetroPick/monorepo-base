import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MarketDetailPage } from "../pages/MarketDetailPage";
import { sampleMarketDetail } from "../fixtures/openapi-examples";

const hooks = vi.hoisted(() => ({
  capabilities: { data: { features: { realtime: false }, catalog: true } },
  event: {
    data: {
      id: "polymarket:event:123",
      title: "Conformance event",
      markets: [
        {
          id: "polymarket:market:789",
          question: "Related canonical market",
          status: "open",
          outcomes: [],
          freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z" },
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  useMarketsPriceHistory: vi.fn(() => ({
    data: {
      schemaVersion: "1",
      marketId: sampleMarketDetail.id,
      tokenId: "token-yes",
      interval: "1d",
      points: [
        { timestamp: "2026-07-30T10:00:00Z", price: "0.40", derived: false, source: "polymarket_clob" },
        { timestamp: "2026-07-30T12:00:00Z", price: "0.42", derived: false, source: "polymarket_clob" },
      ],
      freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 },
      provenance: { source: "polymarket_clob", observedAt: "2026-07-30T12:00:00Z" },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMarketsMarketHealth: vi.fn(() => ({
    data: {
      schemaVersion: "1",
      marketId: sampleMarketDetail.id,
      algorithm: "depth_v1",
      observedAt: "2026-07-30T12:00:00Z",
      spread: "0.02",
      bestBid: "0.41",
      bestAsk: "0.43",
      bidDepth: "100",
      askDepth: "50",
      snapshotAgeMs: 1000,
      crossed: false,
      freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 },
      provenance: { source: "polymarket_clob", observedAt: "2026-07-30T12:00:00Z" },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMarketsOrderBook: vi.fn(() => ({
    data: {
      schemaVersion: "1",
      marketId: sampleMarketDetail.id,
      tokenId: "token-yes",
      bids: [{ price: "0.41", size: "100" }],
      asks: [{ price: "0.43", size: "50" }],
      spread: "0.02",
      freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 },
      timestamp: "2026-07-30T12:00:00Z",
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock("../hooks/useMarketsQueries", () => ({
  useMarketsCapabilities: () => hooks.capabilities,
  useMarketsMarket: () => ({
    data: sampleMarketDetail,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMarketsEvent: () => hooks.event,
  useMarketsOrderBook: hooks.useMarketsOrderBook,
  useMarketsPriceHistory: hooks.useMarketsPriceHistory,
  useMarketsMarketHealth: hooks.useMarketsMarketHealth,
}));

vi.mock("../trading/components/OrderTicketPanel", () => ({
  OrderTicketPanel: () => (
    <section aria-label="Order ticket">
      <h3>Order ticket</h3>
      <button type="button" disabled>
        Preview order
      </button>
      <p>Order submission unavailable</p>
    </section>
  ),
}));

function renderMarketPage(marketId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/markets/m/${encodeURIComponent(marketId)}`]}>
        <Routes>
          <Route path="/markets/m/:marketId" element={<MarketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MarketDetailPage", () => {
  it("keeps REST polling active until a browser realtime subscriber exists", () => {
    hooks.capabilities = { data: { features: { realtime: true }, catalog: true } };
    renderMarketPage("polymarket:market:456");

    expect(hooks.useMarketsOrderBook).toHaveBeenLastCalledWith(
      "polymarket:market:456",
      "token-yes",
      true,
      true,
    );
  });

  it("renders resolution rules and source links for canonical ids", () => {
    renderMarketPage("polymarket:market:456");

    expect(screen.getByRole("heading", { name: sampleMarketDetail.question })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Official results" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /order ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview order/i })).toBeDisabled();
  });

  it("presents canonical sparse history, liquidity health, end date, and related markets", () => {
    renderMarketPage("polymarket:market:456");

    expect(screen.getByRole("region", { name: /price history/i })).toHaveTextContent("0.42");
    expect(screen.getByRole("region", { name: /market health/i })).toHaveTextContent("Best bid");
    expect(screen.getByText(/december 31, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /related canonical market/i })).toHaveAttribute(
      "href",
      "/markets/m/polymarket%3Amarket%3A789",
    );
  });

  it("keeps stale and resyncing read surfaces explicit without substituting values", () => {
    hooks.useMarketsPriceHistory.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error("history unavailable"),
      refetch: vi.fn(),
    });
    hooks.useMarketsMarketHealth.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error("health unavailable"),
      refetch: vi.fn(),
    });
    hooks.useMarketsOrderBook.mockReturnValueOnce({
      data: {
        schemaVersion: "1",
        marketId: sampleMarketDetail.id,
        tokenId: "token-yes",
        bids: [],
        asks: [],
        spread: null,
        freshness: { state: "resyncing", observedAt: "2026-07-30T12:00:00Z" },
        timestamp: "2026-07-30T12:00:00Z",
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderMarketPage("polymarket:market:456");

    expect(screen.getByText(/history unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/health unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("Resyncing")).toBeInTheDocument();
    expect(screen.getByText(/one-sided or empty book/i)).toBeInTheDocument();
  });

  it("shows invalid id empty state", () => {
    renderMarketPage("not-a-canonical-id");
    expect(screen.getByText(/invalid market identifier/i)).toBeInTheDocument();
  });
});
