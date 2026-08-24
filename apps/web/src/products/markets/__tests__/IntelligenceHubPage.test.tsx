import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IntelligenceHubPage } from "../pages/IntelligenceHubPage";

const hooks = vi.hoisted(() => ({
  capabilities: {
    data: { intelligence: true, features: { intelligence_whale_feed: false } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  whales: {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  signals: {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
}));

vi.mock("../hooks/useMarketsQueries", () => ({
  useMarketsCapabilities: () => hooks.capabilities,
  useMarketsSignals: () => hooks.signals,
  useMarketsWhales: () => hooks.whales,
}));

vi.mock("../components/shell/MarketsAppShell", () => ({
  MarketsAppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/markets/intelligence"]}>
      <IntelligenceHubPage />
    </MemoryRouter>,
  );
}

const whale = {
  fingerprint: "whale-1",
  wallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  marketId: "polymarket:market:456",
  marketTitle: "Canonical market title",
  outcome: "Yes",
  side: "BUY",
  price: "0.42",
  size: "100",
  notionalUsd: "42000",
  tradeTs: "2026-08-24T12:00:00Z",
  whaleScore: "80",
  reasonCodes: ["WHALE_NOTIONAL_THRESHOLD"],
  freshness: { state: "stale", observedAt: "2026-08-24T11:50:00Z", ageMillis: 600000 },
  provenance: { source: "polymarket_data", upstreamId: "trade-1", observedAt: "2026-08-24T12:00:00Z" },
  evidence: {
    version: 1,
    signalType: "whale_trade",
    computedAt: "2026-08-24T12:00:00Z",
    inputs: { tradeId: "trade-1" },
    metrics: { notionalMinor: 42000000000 },
    paramsRef: "intelligence_params_v1.yaml#whale_score_launch",
    reasonCodes: ["WHALE_NOTIONAL_THRESHOLD"],
    hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lifecycle: "active",
  },
  lagSeconds: 600,
  source: "data_trades",
} as const;

describe("IntelligenceHubPage", () => {
  beforeEach(() => {
    hooks.capabilities = {
      data: { intelligence: true, features: { intelligence_whale_feed: false } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    hooks.whales = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
    hooks.signals = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
  });

  it("does not display whale data when the BFF capability is disabled", () => {
    renderPage();

    expect(screen.getByText("Whale feed unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Canonical market title")).not.toBeInTheDocument();
  });

  it("renders stale BFF whale evidence without inventing a recommendation", () => {
    hooks.capabilities.data.features.intelligence_whale_feed = true;
    hooks.whales.data = {
      schemaVersion: "1",
      items: [whale],
      page: { nextCursor: null, limit: 50 },
      checkedAt: "2026-08-24T12:10:00Z",
      freshness: { state: "stale", observedAt: "2026-08-24T11:50:00Z", ageMillis: 1200000 },
    };

    renderPage();

    expect(screen.getByText("Canonical market title")).toBeInTheDocument();
    expect(screen.getByText(/intelligence delayed/i)).toBeInTheDocument();
    expect(screen.getByText(/WHALE_NOTIONAL_THRESHOLD/)).toBeInTheDocument();
    expect(screen.getByText(/sha256:aaaaaaaa/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy|follow|order/i })).toBeNull();
  });

  it("keeps retracted signals visible as retracted and flags partial provenance", () => {
    hooks.capabilities.data.features.intelligence_whale_feed = true;
    hooks.signals.data = {
      schemaVersion: "1",
      signals: [
        {
          schemaVersion: "1",
          id: "signal-1",
          type: "price_move",
          marketId: "polymarket:market:456",
          state: "retracted",
          ruleVersion: "signal-rules-v1",
          reasonCodes: ["PRICE_MOVE"],
          createdAt: "2026-08-24T12:00:00Z",
          retractedAt: "2026-08-24T12:05:00Z",
          idempotencyKey: "signal-1",
          evidence: [{ kind: "trade", referenceId: "trade-1", observedAt: "2026-08-24T12:00:00Z", contentHash: "" }],
        },
      ],
      page: { nextCursor: null, limit: 50 },
    };

    renderPage();

    expect(screen.getByText("Retracted")).toBeInTheDocument();
    expect(screen.getByText(/Evidence incomplete/)).toBeInTheDocument();
  });
});
