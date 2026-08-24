import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { MarketsWalletSessionProvider } from "../providers/MarketsWalletSessionProvider";
import { useMarketsWalletSession } from "../hooks/useMarketsWalletSession";

const WALLET = "0x1234567890AbcdEF1234567890aBcdef12345678" as const;
const OTHER_WALLET = "0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD" as const;
const EXPIRES_AT = "2099-08-09T12:15:00Z";

const signMessageAsync = vi.fn();

function mockAuthFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/session")) {
      return {
        ok: false,
        status: 401,
      };
    }
    if (url.includes("/auth/nonce")) {
      return {
        ok: true,
        json: async () => ({ nonce: "abcd1234ef567890abcdef1234567890", expiresIn: 600, chainId: 137 }),
      };
    }
    if (url.includes("/auth/siwe")) {
      return {
        ok: true,
        json: async () => ({
          authenticated: true,
          wallet: WALLET,
          expiresAt: EXPIRES_AT,
        }),
      };
    }
    if (url.includes("/auth/logout")) {
      return {
        ok: true,
        json: async () => ({ ok: true }),
      };
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
}

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useSignMessage: () => ({ signMessageAsync }),
}));

import { useAccount } from "wagmi";

function wrapper({ children }: { children: ReactNode }) {
  return <MarketsWalletSessionProvider>{children}</MarketsWalletSessionProvider>;
}

describe("useMarketsWalletSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8080");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        host: "localhost:3001",
        origin: "http://localhost:3001",
      },
    });
    signMessageAsync.mockReset();
    vi.mocked(useAccount).mockReturnValue({
      address: WALLET,
      isConnected: true,
      chainId: 137,
    } as ReturnType<typeof useAccount>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("restores authenticated session when wallet matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/session")) {
          return {
            ok: true,
            json: async () => ({
              authenticated: true,
              wallet: WALLET,
              expiresAt: EXPIRES_AT,
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const { result } = renderHook(() => useMarketsWalletSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSessionAuthenticated).toBe(true);
    });
    expect(result.current.sessionWallet).toBe(WALLET);
  });

  it("stays idle when restored session wallet mismatches connected wallet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/session")) {
          return {
            ok: true,
            json: async () => ({
              authenticated: true,
              wallet: OTHER_WALLET,
              expiresAt: EXPIRES_AT,
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const { result } = renderHook(() => useMarketsWalletSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessionState).toBe("idle");
    });
    expect(result.current.sessionError).toMatch(/does not match/i);
  });

  it("rejects an expired restored session instead of treating it as authenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/session")) {
          return {
            ok: true,
            json: async () => ({
              authenticated: true,
              wallet: WALLET,
              expiresAt: new Date(Date.now() - 60_000).toISOString(),
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const { result } = renderHook(() => useMarketsWalletSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessionState).toBe("idle");
    });
    expect(result.current.isSessionAuthenticated).toBe(false);
    expect(result.current.sessionError).toMatch(/expired/i);
  });

  it("demotes an authenticated session when its expiry time is reached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/auth/session")) {
          return {
            ok: true,
            json: async () => ({
              authenticated: true,
              wallet: WALLET,
              expiresAt: new Date(Date.now() + 1_000).toISOString(),
            }),
          };
        }
        throw new Error(`unexpected fetch: ${String(input)}`);
      }),
    );

    const { result } = renderHook(() => useMarketsWalletSession(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.isSessionAuthenticated).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(result.current.isSessionAuthenticated).toBe(false);
    expect(result.current.sessionState).toBe("idle");
    expect(result.current.sessionError).toMatch(/expired/i);
    vi.useRealTimers();
  });

  it("authenticates with server nonce and SIWE verify", async () => {
    const fetchMock = mockAuthFetch();
    vi.stubGlobal("fetch", fetchMock);
    signMessageAsync.mockResolvedValue("0xsig");

    const { result } = renderHook(() => useMarketsWalletSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.sessionState).toBe("idle");
    });

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.isSessionAuthenticated).toBe(true);
    expect(signMessageAsync).toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/auth/nonce"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/auth/siwe"))).toBe(true);
  });

  it("logout clears local session state", async () => {
    document.cookie = "mkt_csrf=csrf-token; path=/";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/session")) {
          return {
            ok: true,
            json: async () => ({
              authenticated: true,
              wallet: WALLET,
              expiresAt: EXPIRES_AT,
            }),
          };
        }
        if (url.includes("/auth/logout")) {
          return { ok: true, json: async () => ({ ok: true }) };
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const { result } = renderHook(() => useMarketsWalletSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSessionAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isSessionAuthenticated).toBe(false);
    expect(result.current.sessionState).toBe("idle");
  });
});
