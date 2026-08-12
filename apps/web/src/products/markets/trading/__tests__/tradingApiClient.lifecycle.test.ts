import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../wallet/config/runtimeEnv", () => ({
  getMarketsApiOrigin: () => "http://localhost:8080",
}));

import {
  cancelOrder,
  listMyFills,
  listMyPositions,
  previewCancelOrder,
} from "../lib/tradingApiClient";

const API_BASE = "http://localhost:8080/api/v1/markets";

describe("tradingApiClient lifecycle endpoints", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the authenticated BFF for fills and positions", async () => {
    await listMyFills();
    await listMyPositions();

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE}/me/fills`,
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE}/me/positions`,
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("requires a cancel preview before sending the signed cancel", async () => {
    await previewCancelOrder("order-1");
    await cancelOrder("order-1", {
      previewId: "cancel-preview-1",
      contentHash: "0xabc",
      signature: "0xsignature",
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE}/orders/order-1/cancel-preview`,
      expect.objectContaining({ method: "POST", credentials: "include", body: "{}" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE}/orders/order-1/cancel`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          previewId: "cancel-preview-1",
          contentHash: "0xabc",
          signature: "0xsignature",
        }),
        headers: expect.objectContaining({ "Idempotency-Key": "11111111-1111-4111-8111-111111111111" }),
      }),
    );
  });
});