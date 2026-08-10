import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockSession = vi.fn();

vi.mock("../../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => mockSession(),
}));

vi.mock("../../wallet/config/runtimeEnv", () => ({
  getMarketsApiOrigin: () => "http://localhost:8080",
}));

import { FundingApiError } from "../lib/fundingApiClient";
import { useMarketsCollateralBalance } from "../hooks/useMarketsCollateralBalance";

describe("useMarketsCollateralBalance", () => {
  beforeEach(() => {
    mockSession.mockReturnValue({ isSessionAuthenticated: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays idle without account wallet", () => {
    const { result } = renderHook(() => useMarketsCollateralBalance(undefined));
    expect(result.current.state).toBe("idle");
  });

  it("maps 404 account_not_linked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: { code: "account_not_linked", message: "no linked account wallet" },
        }),
      }),
    );

    const { result } = renderHook(() =>
      useMarketsCollateralBalance("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
    );

    await waitFor(() => {
      expect(result.current.state).toBe("not_linked");
    });
  });

  it("maps 502 upstream_unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({
          error: { code: "upstream_unavailable", message: "venue down" },
        }),
      }),
    );

    const { result } = renderHook(() =>
      useMarketsCollateralBalance("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
    );

    await waitFor(() => {
      expect(result.current.state).toBe("upstream_error");
    });
  });

  it("loads balance on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          schemaVersion: "1",
          signerAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          accountWallet: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          collateral: { amount: "5000000", currency: "pUSD", decimals: 6 },
          checkedAt: "2026-08-09T10:00:00Z",
        }),
      }),
    );

    const { result } = renderHook(() =>
      useMarketsCollateralBalance("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
    );

    await waitFor(() => {
      expect(result.current.state).toBe("ready");
    });
    expect(result.current.data?.collateral.amount).toBe("5000000");
  });

  it("does not fetch when session is missing", () => {
    mockSession.mockReturnValue({ isSessionAuthenticated: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useMarketsCollateralBalance("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("FundingApiError", () => {
  it("exposes error code", () => {
    const err = new FundingApiError("account_not_linked", "missing", 404);
    expect(err.code).toBe("account_not_linked");
  });
});
