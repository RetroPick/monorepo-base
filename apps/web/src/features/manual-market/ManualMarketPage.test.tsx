import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManualMarketPage } from "./ManualMarketPage";
import type { ManualMarketViewModel } from "./types";

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

vi.mock("@/components/market/ProbabilityChart", () => ({
  default: () => <div data-testid="probability-chart">Chart</div>,
}));

vi.mock("@/components/market/MarketRules", () => ({
  default: () => <div data-testid="market-rules">Rules</div>,
}));

vi.mock("@/components/market/IdeasActivityPanel", () => ({
  default: () => <div data-testid="activity">Activity</div>,
}));

vi.mock("./ManualTradeCard", () => ({
  ManualTradeCard: () => <div data-testid="trade-card">trade</div>,
}));

const baseModel: ManualMarketViewModel = {
  kind: "discovery",
  discoveryMarketId: "test-market",
  title: "Test exact market",
  category: "Crypto",
  outcomes: [
    { id: "yes", label: "Yes", probability: 51 },
    { id: "no", label: "No", probability: 49 },
  ],
  volumeLabel: "$1.2M",
  headerStats: [
    { label: "Vol", value: "$1.2M" },
  ],
  relatedMarkets: [],
  tradeContext: null,
};

describe("ManualMarketPage", () => {
  it("renders title, trade card, rules, and activity", async () => {
    render(
      <ManualMarketPage
        model={baseModel}
        onBack={vi.fn()}
        backLabel="Back"
      />,
    );

    expect(screen.getByRole("heading", { name: "Test exact market" })).toBeInTheDocument();
    const headlineVol = screen.getByTestId("market-headline-volume");
    expect(headlineVol).toHaveTextContent("Vol");
    expect(headlineVol).toHaveTextContent("$1.2M");
    expect(screen.getByTestId("trade-card")).toBeInTheDocument();
    expect(screen.getByTestId("market-rules")).toBeInTheDocument();
    expect(screen.getByTestId("activity")).toBeInTheDocument();
    /** ProbabilityChart is React.lazy; await its Suspense boundary to resolve. */
    expect(await screen.findByTestId("probability-chart")).toHaveTextContent("Chart");
  });
});
