import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addressesMatch,
  fetchAuthNonce,
  fetchAuthSession,
  postAuthLogout,
  postSiweVerify,
} from "../lib/marketsAuthClient";

const API_ORIGIN = "http://localhost:8080";

describe("marketsAuthClient", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_ORIGIN);
    document.cookie = "mkt_csrf=; max-age=0; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    document.cookie = "mkt_csrf=; max-age=0; path=/";
  });

  it("fetchAuthNonce parses server nonce and validates chain id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nonce: "server-nonce", expiresIn: 600, chainId: 137 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const nonce = await fetchAuthNonce();
    expect(nonce.nonce).toBe("server-nonce");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_ORIGIN}/api/v1/markets/auth/nonce`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("fetchAuthNonce rejects mismatched chain id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ nonce: "server-nonce", expiresIn: 600, chainId: 1 }),
      }),
    );

    await expect(fetchAuthNonce()).rejects.toMatchObject({ code: "CHAIN_MISMATCH" });
  });

  it("fetchAuthSession returns null on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(fetchAuthSession()).resolves.toBeNull();
  });

  it("postSiweVerify sends credentials include", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authenticated: true,
        wallet: "0xabc",
        expiresAt: "2026-08-09T12:15:00Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postSiweVerify({ message: "msg", signature: "0xsig" });
    expect(result.wallet).toBe("0xabc");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_ORIGIN}/api/v1/markets/auth/siwe`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ message: "msg", signature: "0xsig" }),
      }),
    );
  });

  it("postAuthLogout sends CSRF header from cookie", async () => {
    document.cookie = "mkt_csrf=csrf-token-123; path=/";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    await postAuthLogout();
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_ORIGIN}/api/v1/markets/auth/logout`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "X-CSRF-Token": "csrf-token-123",
        }),
      }),
    );
  });

  it("postAuthLogout fails when CSRF cookie is missing", async () => {
    document.cookie = "mkt_csrf=; max-age=0; path=/";
    await expect(postAuthLogout()).rejects.toMatchObject({ code: "AUTH_FAILED" });
  });

  it("addressesMatch compares case-insensitively", () => {
    expect(addressesMatch("0xAbC", "0xabc")).toBe(true);
    expect(addressesMatch("0xabc", "0xdef")).toBe(false);
  });
});
