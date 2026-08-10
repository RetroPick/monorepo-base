import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MarketDetailPage } from "../pages/MarketDetailPage";
import { sampleMarketDetail } from "../fixtures/openapi-examples";

vi.mock("../hooks/useMarketsQueries", () => ({
  useMarketsCapabilities: () => ({ data: { features: { realtime: false }, catalog: true } }),
  useMarketsMarket: () => ({
    data: sampleMarketDetail,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMarketsOrderBook: () => ({
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
  }),
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
  it("renders resolution rules and source links for canonical ids", () => {
    renderMarketPage("polymarket:market:456");

    expect(screen.getByRole("heading", { name: sampleMarketDetail.question })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Official results" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /order ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview order/i })).toBeDisabled();
  });

  it("shows invalid id empty state", () => {
    renderMarketPage("not-a-canonical-id");
    expect(screen.getByText(/invalid market identifier/i)).toBeInTheDocument();
  });
});
