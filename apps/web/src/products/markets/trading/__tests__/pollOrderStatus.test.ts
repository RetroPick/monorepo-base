import { describe, expect, it, vi } from "vitest";

import {
  isOrderSuccessStatus,
  isTerminalOrderStatus,
  needsReconcilePolling,
  pollOrderUntilTerminal,
} from "../lib/pollOrderStatus";
import type { OrdersListResponse, UserOrder } from "../lib/tradingApiClient";

const baseOrder: UserOrder = {
  orderId: "ord-1",
  marketId: "polymarket:market:1",
  tokenId: "tok-1",
  side: "BUY",
  price: "0.50",
  originalSize: "10",
  filledSize: "0",
  remainingSize: "10",
  status: "unknown",
  exchangeDomain: "standard",
  createdAt: "2026-08-09T00:00:00Z",
  updatedAt: "2026-08-09T00:00:00Z",
};

function listStub(sequence: UserOrder["status"][]) {
  let call = 0;
  return vi.fn(async (): Promise<OrdersListResponse> => {
    const status = sequence[Math.min(call, sequence.length - 1)];
    call += 1;
    return {
      schemaVersion: "1",
      orders: [{ ...baseOrder, status }],
      page: { limit: 50 },
      checkedAt: "2026-08-09T00:00:00Z",
      provenance: { source: "polymarket_clob", observedAt: "2026-08-09T00:00:00Z" },
    };
  });
}

describe("pollOrderStatus helpers", () => {
  it("detects reconcile polling need", () => {
    expect(needsReconcilePolling("unknown")).toBe(true);
    expect(needsReconcilePolling("open", ["unknown_reconciling"])).toBe(true);
    expect(needsReconcilePolling("open")).toBe(false);
  });

  it("classifies terminal and success statuses", () => {
    expect(isTerminalOrderStatus("unknown")).toBe(false);
    expect(isTerminalOrderStatus("open")).toBe(true);
    expect(isOrderSuccessStatus("filled")).toBe(true);
    expect(isOrderSuccessStatus("rejected")).toBe(false);
  });
});

describe("pollOrderUntilTerminal", () => {
  it("resolves when order leaves unknown", async () => {
    const listOrders = listStub(["unknown", "open"]);
    const result = await pollOrderUntilTerminal("ord-1", {
      intervalMs: 1,
      timeoutMs: 500,
      listOrders,
    });
    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.order.status).toBe("open");
    }
    expect(listOrders.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("times out while still unknown", async () => {
    const listOrders = listStub(["unknown"]);
    const result = await pollOrderUntilTerminal("ord-1", {
      intervalMs: 1,
      timeoutMs: 10,
      listOrders,
    });
    expect(result.kind).toBe("timeout");
  });
});
