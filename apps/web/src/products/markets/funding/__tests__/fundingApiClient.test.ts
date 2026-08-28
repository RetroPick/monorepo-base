import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../wallet/config/runtimeEnv", () => ({
  getMarketsApiOrigin: () => "http://localhost:8080",
}));

import {
  getBalances,
  linkExistingWallet,
  previewAccountWallet,
  relayAccountWallet,
} from "../lib/fundingApiClient";

const API_BASE = "http://localhost:8080/api/v1/markets";

describe("fundingApiClient OpenAPI alignment", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("previewAccountWallet sends action body without Idempotency-Key", async () => {
    await previewAccountWallet({ action: "deploy_deposit_wallet" });

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/account-wallet/preview`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ action: "deploy_deposit_wallet" }),
      }),
    );
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.headers).not.toHaveProperty("Idempotency-Key");
    expect(init?.cache).toBe("no-store");
  });

  it("previewAccountWallet defaults to empty body", async () => {
    await previewAccountWallet();

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.body).toBe("{}");
  });

  it("linkExistingWallet sends Idempotency-Key and credentials", async () => {
    await linkExistingWallet({
      accountWallet: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      walletType: "GNOSIS_SAFE",
    });

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/me/wallets/link`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
  });

  it("fails closed when cryptographic UUID generation is unavailable", async () => {
    vi.stubGlobal("crypto", {});

    await expect(
      linkExistingWallet({
        accountWallet: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        walletType: "GNOSIS_SAFE",
      }),
    ).rejects.toMatchObject({ code: "unavailable", message: expect.stringMatching(/cryptographic/i) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("relayAccountWallet sends accountWallet body with Idempotency-Key", async () => {
    await relayAccountWallet({
      accountWallet: "0xdddddddddddddddddddddddddddddddddddddddd",
      chainId: 137,
    });

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/account-wallet/relay`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          accountWallet: "0xdddddddddddddddddddddddddddddddddddddddd",
          chainId: 137,
        }),
        headers: expect.objectContaining({
          "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
  });

  it("reads private collateral with no-store cache semantics", async () => {
    await getBalances();

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/me/balances`,
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }),
    );
  });
});
