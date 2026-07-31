import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import MarketsAll from "@/views/MarketsAll";

vi.mock("@/components/Header", () => ({ default: () => <div data-testid="header" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <div data-testid="footer" /> }));
vi.mock("@/features/markets/hooks/useMarketsQueries", () => ({
  useMarketsCapabilities: () => ({ data: { catalog: true, features: { realtime: false } } }),
  useMarketsEventsInfinite: () => ({
    data: { pages: [{ events: [], freshness: undefined }] },
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe("MarketsAll", () => {
  it("renders BFF-backed Polymarket discovery", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MarketsAll />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Discover" })).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByText("Crypto")).not.toBeInTheDocument();
  });
});
