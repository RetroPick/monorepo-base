import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function renderAll(initialVertical: DiscoveryVerticalId = "trending") {
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

  it("renders Trending layout with market types strip and full-width market grid", async () => {
    renderAll("trending");

    await waitFor(() => {
      expect(screen.getByTestId("discover-layout-trending")).toBeInTheDocument();
    });
    expect(screen.getByTestId("discover-trending-market-grid")).toBeInTheDocument();
    expect(screen.getByTestId("discover-market-types-strip")).toBeInTheDocument();
    expect(screen.getByTestId("discover-market-types-scroll-prev")).toBeInTheDocument();
    expect(screen.getByTestId("discover-market-types-scroll-next")).toBeInTheDocument();
    expect(screen.queryByTestId("discover-featured-hero")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Market types" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All markets" })).toBeInTheDocument();

    const learnBtn = screen.getByRole("button", { name: /Learn how Direction markets work/i });
    fireEvent.click(learnBtn);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Direction" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Step 1 of 6/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(within(dialog).getByText(/Step 2 of 6/)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "How you take part", level: 3 })).toBeInTheDocument();
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows empty state for non-crypto verticals until API supports tags", async () => {
    renderAll("economics");

    expect(await screen.findByTestId("discover-empty-vertical")).toBeInTheDocument();
    expect(screen.getByText(/No markets in this category yet/)).toBeInTheDocument();
  });
});
