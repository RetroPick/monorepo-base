import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryData = new Map<string, unknown>();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryData.get(queryKey.at(-1) ?? ""),
    error: null,
    isLoading: false,
  }),
}));

vi.mock("wagmi", () => ({
  useSignTypedData: () => ({ signTypedDataAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../hooks/useMarketsQueries", () => ({
  useMarketsCapabilities: () => ({
    data: { features: { portfolio_read: true, order_submit: false } },
  }),
}));

vi.mock("../../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => ({ isSessionAuthenticated: true }),
}));

import { TradingLifecyclePanel } from "../components/TradingLifecyclePanel";

describe("TradingLifecyclePanel portfolio availability", () => {
  beforeEach(() => {
    queryData.clear();
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

  it("preserves fixed-point display for available aggregate values", () => {
    queryData.set("summary", {
      aggregate: {
        totalMarkValue: { amount: "1234567", currency: "USDC", decimals: 6 },
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

    expect(screen.getByText("1.234567 USDC")).toBeInTheDocument();
    expect(screen.getByText("0.234567 USDC")).toBeInTheDocument();
    expect(screen.getByText("-0.01 USDC")).toBeInTheDocument();
    expect(screen.queryByText(/source unavailable/i)).not.toBeInTheDocument();
  });
});
