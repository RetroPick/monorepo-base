import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageContext";
import type { DiscoveryVerticalId } from "@/lib/discovery-verticals";
import MarketsAll from "./MarketsAll";

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

vi.mock("@/hooks/useIndexerWebSocket", () => ({
  useIndexerWebSocket: vi.fn(),
}));

const mockRow = {
  templateId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  slug: "btc-up-down",
  marketType: 0,
  outcomeCount: 2,
  initialized: true,
  executionMode: 0,
  rollingPhase: 0,
  rollingHaltReason: 0,
  lastIndexedBlock: 100,
  lastIndexedAt: "2026-04-25T11:12:34Z",
  activeEpochId: 1,
};

vi.mock("@/lib/api/retropickApi", () => ({
  fetchMarkets: vi.fn(async () => [mockRow]),
  apiErrorSummary: (e: unknown) => String(e),
}));

function renderAll(initialVertical: DiscoveryVerticalId = "crypto") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LanguageProvider>
          <MarketsAll initialVertical={initialVertical} />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MarketsAll", () => {
  it("renders Crypto layout with left nav and indexed market cards from API", async () => {
    renderAll("crypto");

    expect(await screen.findByRole("heading", { name: "Crypto" })).toBeInTheDocument();
    expect(screen.getByTestId("discover-layout-crypto")).toBeInTheDocument();
    expect(
      screen.queryByTestId("discover-crypto-nav-mobile") ?? screen.queryByTestId("discover-crypto-nav-desktop"),
    ).toBeTruthy();
    expect(await screen.findByText("Btc Up Down")).toBeInTheDocument();
  });

  it("renders Trending layout with featured hero and right rail", async () => {
    renderAll("trending");

    await waitFor(() => {
      expect(screen.getByTestId("discover-layout-trending")).toBeInTheDocument();
    });
    expect(screen.getByTestId("discover-featured-hero")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All markets" })).toBeInTheDocument();
    expect(screen.getByText("Up or Down")).toBeInTheDocument();
  });

  it("shows empty state for non-crypto verticals until API supports tags", async () => {
    renderAll("economics");

    expect(await screen.findByTestId("discover-empty-vertical")).toBeInTheDocument();
    expect(screen.getByText(/No markets in this category yet/)).toBeInTheDocument();
  });
});
