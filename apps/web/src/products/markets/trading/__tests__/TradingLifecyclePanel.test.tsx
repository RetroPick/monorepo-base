import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryData = new Map<string, unknown>();
const queryConfigs = new Map<string, { enabled: boolean; queryFn: ReturnType<typeof vi.fn> }>();
let capabilityFeatures = { portfolio_read: true, order_submit: false };
let session = { isSessionAuthenticated: true, expiresAt: "2099-01-01T00:00:00Z" };
const getEligibility = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({
    queryKey,
    queryFn: configuredQueryFn,
    enabled = true,
  }: {
    queryKey: string[];
    enabled?: boolean;
    queryFn: () => unknown;
  }) => {
    const key = queryKey.at(-1) ?? "";
    const queryFn = vi.fn(configuredQueryFn);
    queryConfigs.set(key, { enabled, queryFn });
    if (enabled) queryFn();
    return {
      data: queryData.get(key),
      error: null,
      isLoading: false,
    };
  },
}));

vi.mock("wagmi", () => ({
  useSignTypedData: () => ({ signTypedDataAsync: vi.fn(), isPending: false }),
  useSignMessage: () => ({ signMessageAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../api/marketsClient", () => ({
  getMarketsClient: () => ({ getEligibility }),
}));

vi.mock("../../wallet/config/runtimeEnv", () => ({
  getMarketsApiOrigin: () => "http://localhost:8080",
}));

vi.mock("../lib/tradingApiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tradingApiClient")>();
  return {
    ...actual,
    listMyOrders: vi.fn(() => Promise.resolve(queryData.get("orders"))),
    listMyFills: vi.fn(() => Promise.resolve(queryData.get("fills"))),
    listMyPositions: vi.fn(() => Promise.resolve(queryData.get("positions"))),
    getMyPortfolioSummary: vi.fn(() => Promise.resolve(queryData.get("summary"))),
    listMyActivity: vi.fn(() => Promise.resolve(queryData.get("activity"))),
    previewCancelOrder: vi.fn(),
    cancelOrder: vi.fn(),
  };
});

vi.mock("../../hooks/useMarketsQueries", () => ({
  useMarketsCapabilities: () => ({
    data: { features: capabilityFeatures },
  }),
}));

vi.mock("../../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => session,
}));

import { TradingLifecyclePanel } from "../components/TradingLifecyclePanel";

describe("TradingLifecyclePanel portfolio availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryData.clear();
    queryConfigs.clear();
    capabilityFeatures = { portfolio_read: true, order_submit: false };
    session = { isSessionAuthenticated: true, expiresAt: "2099-01-01T00:00:00Z" };
    getEligibility.mockReset();
    queryData.set("orders", { orders: [] });
    queryData.set("fills", { fills: [] });
    queryData.set("positions", { positions: [] });
    queryData.set("activity", { events: [] });
  });

  it("renders unavailable nullable metrics as em dashes with source coverage", () => {
    queryData.set("summary", {
      aggregate: {
        totalMarkValue: null,
        totalCostBasis: { amount: "1200000", currency: "USDC", decimals: 6 },
        unrealizedPnl: null,
        realizedPnl: null,
        claimableValue: { amount: "0", currency: "USDC", decimals: 6 },
        openPositionCount: 2,
        availability: {
          markValue: {
            state: "unavailable",
            availableOpenPositionCount: 1,
            unavailableOpenPositionCount: 1,
          },
          realizedPnl: { state: "unavailable" },
        },
      },
      pnlDisclaimer: "Projected values are informational.",
    });

    render(<TradingLifecyclePanel />);

    expect(screen.getByText("Mark value").nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText("Unrealized PnL").nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText("Realized PnL").nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText(/mark coverage unavailable for 1 of 2 open positions/i)).toBeInTheDocument();
    expect(screen.getByText(/realized pnl source unavailable/i)).toBeInTheDocument();
  });

  it("preserves known zero separately from unavailable fixed-point aggregate values", () => {
    queryData.set("summary", {
      aggregate: {
        totalMarkValue: { amount: "0", currency: "USDC", decimals: 6 },
        totalCostBasis: { amount: "1000000", currency: "USDC", decimals: 6 },
        unrealizedPnl: { amount: "234567", currency: "USDC", decimals: 6 },
        realizedPnl: { amount: "-10000", currency: "USDC", decimals: 6 },
        claimableValue: { amount: "0", currency: "USDC", decimals: 6 },
        openPositionCount: 1,
        availability: {
          markValue: {
            state: "available",
            availableOpenPositionCount: 1,
            unavailableOpenPositionCount: 0,
          },
          realizedPnl: { state: "available" },
        },
      },
      pnlDisclaimer: "Projected values are informational.",
    });

    render(<TradingLifecyclePanel />);

    expect(screen.getByText("Mark value").nextElementSibling).toHaveTextContent("0 USDC");
    expect(screen.getByText("0.234567 USDC")).toBeInTheDocument();
    expect(screen.getByText("-0.01 USDC")).toBeInTheDocument();
    expect(screen.queryByText(/source unavailable/i)).not.toBeInTheDocument();
  });

  it("labels stale partial position projections without turning unavailable values into zero", () => {
    queryData.set("summary", {
      aggregate: {
        totalMarkValue: null,
        totalCostBasis: { amount: "1200000", currency: "USDC", decimals: 6 },
        unrealizedPnl: null,
        realizedPnl: null,
        claimableValue: { amount: "0", currency: "USDC", decimals: 6 },
        openPositionCount: 1,
        availability: {
          markValue: { state: "unavailable", availableOpenPositionCount: 0, unavailableOpenPositionCount: 1 },
          realizedPnl: { state: "unavailable" },
        },
      },
      freshness: { state: "stale", observedAt: "2026-08-09T10:00:00Z", ageMillis: 120_000 },
      pnlDisclaimer: "Projected values are informational.",
    });
    queryData.set("positions", {
      positions: [{
        positionId: "position-partial",
        outcomeName: "Yes",
        tokenId: "token-yes",
        size: "100",
        markPrice: null,
        markValue: null,
        unrealizedPnl: null,
        freshness: { state: "stale", observedAt: "2026-08-09T10:00:00Z", ageMillis: 120_000 },
      }],
    });

    render(<TradingLifecyclePanel />);

    expect(screen.getByText(/portfolio projection may be delayed/i)).toBeInTheDocument();
    expect(screen.getByText("Mark unavailable")).toBeInTheDocument();
    expect(screen.getByText("Current value unavailable")).toBeInTheDocument();
    expect(screen.getByText("Unrealized PnL unavailable")).toBeInTheDocument();
  });

  it("suppresses portfolio UI and queries when portfolio reads are disabled", () => {
    capabilityFeatures = { portfolio_read: false, order_submit: false };

    queryData.set("positions", {
      positions: [{
        positionId: "position-hidden",
        outcomeName: "Hidden position fixture",
        tokenId: "hidden-token",
        size: "3",
        unrealizedPnl: { amount: "0", currency: "USDC", decimals: 6 },
      }],
    });
    queryData.set("activity", {
      events: [{ eventId: "activity-hidden", summary: "Hidden activity fixture" }],
    });
    queryData.set("summary", {
      aggregate: {
        totalMarkValue: { amount: "0", currency: "USDC", decimals: 6 },
        totalCostBasis: { amount: "0", currency: "USDC", decimals: 6 },
        unrealizedPnl: { amount: "0", currency: "USDC", decimals: 6 },
        realizedPnl: { amount: "0", currency: "USDC", decimals: 6 },
        claimableValue: { amount: "0", currency: "USDC", decimals: 6 },
        openPositionCount: 0,
        availability: {
          markValue: {
            state: "available",
            availableOpenPositionCount: 0,
            unavailableOpenPositionCount: 0,
          },
          realizedPnl: { state: "available" },
        },
      },
      pnlDisclaimer: "Hidden portfolio summary fixture.",
    });

    render(<TradingLifecyclePanel />);

    expect(screen.getByRole("status")).toHaveTextContent("Portfolio projections unavailable");
    for (const key of ["orders", "fills", "positions", "summary", "activity"]) {
      const query = queryConfigs.get(key);
      expect(query?.enabled).toBe(false);
      expect(query?.queryFn).not.toHaveBeenCalled();
    }

    expect(screen.queryByRole("heading", { name: "Open orders" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Fills" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Positions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Activity" })).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden position fixture")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden activity fixture")).not.toBeInTheDocument();
    for (const metric of ["Mark value", "Cost basis", "Unrealized PnL", "Realized PnL", "Claimable value"]) {
      expect(screen.queryByText(metric)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/success|submitted|portfolio reads enabled/i)).not.toBeInTheDocument();
  });

  it("does not request a cancel preview when the fresh BFF eligibility decision denies cancellation", async () => {
    capabilityFeatures = { portfolio_read: true, order_submit: true };
    queryData.set("orders", {
      orders: [{ orderId: "order-denied", side: "BUY", remainingSize: "10", price: "0.42", status: "open" }],
    });
    getEligibility.mockResolvedValue({ data: { eligible: false, reason: "Trading is unavailable in your region." } });

    render(<TradingLifecyclePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));

    await waitFor(() => expect(getEligibility).toHaveBeenCalledTimes(1));
    const { previewCancelOrder } = await import("../lib/tradingApiClient");
    expect(previewCancelOrder).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Trading is unavailable in your region.");
  });
});
