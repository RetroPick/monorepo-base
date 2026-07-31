import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MarketsApiError } from "@retropick/polymarket";

import MarketDetailPolymarket from "./MarketDetailPolymarket";

const useMarketsMarket = vi.fn();

vi.mock("@/components/Header", () => ({ default: () => <div data-testid="header" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <div data-testid="footer" /> }));
vi.mock("@/components/Icon", () => ({ default: () => <span /> }));
vi.mock("@/features/markets/components/OrderBookPanel", () => ({
  OrderBookPanel: () => <div data-testid="order-book" />,
}));
vi.mock("@/features/markets/components/PriceChart", () => ({
  PriceChart: () => <div data-testid="price-chart" />,
}));
vi.mock("@/features/markets/hooks/useMarketsQueries", () => ({
  useMarketsMarket: (...args: unknown[]) => useMarketsMarket(...args),
  useMarketsOrderBook: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useMarketsPriceHistory: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useMarketsHealth: () => ({ data: undefined }),
}));

function renderRoute(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/market/:id" element={<MarketDetailPolymarket />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MarketDetailPolymarket route states", () => {
  beforeEach(() => {
    useMarketsMarket.mockReset();
  });

  it("shows invalid identifier for malformed IDs without querying BFF", () => {
    useMarketsMarket.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: vi.fn() });
    renderRoute("/app/market/not-a-polymarket-id");
    expect(screen.getByText("Invalid market identifier")).toBeInTheDocument();
    expect(useMarketsMarket).toHaveBeenCalledWith("not-a-polymarket-id");
  });

  it("shows loading state for valid polymarket IDs", () => {
    useMarketsMarket.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    renderRoute("/app/market/polymarket%3Amarket%3Afixture-1");
    expect(screen.getByText("Loading market…")).toBeInTheDocument();
  });

  it("renders valid polymarket market detail", () => {
    useMarketsMarket.mockReturnValue({
      data: {
        question: "Will it rain?",
        status: "open",
        freshness: { state: "fresh", observedAt: "2026-01-01T00:00:00Z", ageMillis: 1 },
        capabilities: { orderBook: true },
        outcomes: [{ id: "o1", upstreamId: "tok-1", name: "Yes", price: "0.55" }],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderRoute("/app/market/polymarket:market:fixture-1");
    expect(screen.getByText("Will it rain?")).toBeInTheDocument();
    expect(screen.getByTestId("order-book")).toBeInTheDocument();
  });

  it("shows not found for BFF 404", () => {
    useMarketsMarket.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new MarketsApiError("not found", { status: 404, code: "not_found", requestId: "req-404" }),
      refetch: vi.fn(),
    });
    renderRoute("/app/market/polymarket:market:missing");
    expect(screen.getByText("Market not found")).toBeInTheDocument();
    expect(screen.getByText(/req-404/)).toBeInTheDocument();
  });

  it("shows API error for upstream failures", () => {
    useMarketsMarket.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new MarketsApiError("upstream timeout", { status: 504, code: "upstream", requestId: "req-timeout" }),
      refetch: vi.fn(),
    });
    renderRoute("/app/market/polymarket:market:fixture-1");
    expect(screen.getByText("Could not load market")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("resets selected outcome state when market id changes", () => {
    const source = readFileSync(join(process.cwd(), "src/views/MarketDetailPolymarket.tsx"), "utf8");
    expect(source).toContain('setSelectedTokenId("")');
    expect(source).toMatch(/useEffect\(\(\) => \{[\s\S]*setSelectedTokenId\(""\)/);
    expect(source).toContain("[decodedId]");
  });
});
