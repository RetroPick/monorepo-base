import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../wallet/config/runtimeEnv", () => ({
  getMarketsApiOrigin: () => "http://localhost:8080",
}));

import {
  cancelOrder,
  getMyPortfolioSummary,
  listMyActivity,
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

  it("uses authenticated no-store BFF reads for private lifecycle projections", async () => {
    await listMyFills();
    await listMyPositions();
    await getMyPortfolioSummary();
    await listMyActivity();

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE}/me/fills`,
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE}/me/positions`,
      expect.objectContaining({ method: "GET", credentials: "include", cache: "no-store" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      `${API_BASE}/me/portfolio/summary`,
      expect.objectContaining({ method: "GET", credentials: "include", cache: "no-store" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      `${API_BASE}/me/activity`,
      expect.objectContaining({ method: "GET", credentials: "include", cache: "no-store" }),
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