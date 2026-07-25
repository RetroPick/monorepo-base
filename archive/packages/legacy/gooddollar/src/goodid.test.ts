import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GoodDollarStatusError,
  fetchGoodDollarStatus,
  fetchGoodDollarStatusOrThrow,
  fetchGoodIDStatus,
} from "./goodid";

const apiBase = "http://127.0.0.1:8080";
const wallet = "0xabc0000000000000000000000000000000000001";

const sampleStatus = {
  wallet,
  chainId: 44787,
  gDollarBalance: "100",
  goodIdVerified: true,
  rootWallet: "0xroot",
  canClaimOrReceiveG: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchGoodDollarStatus", () => {
  it("returns ok payload aligned with fe-v1 shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => sampleStatus,
      }),
    );

    const result = await fetchGoodDollarStatus(apiBase, wallet);
    expect(result).toEqual({ kind: "ok", data: sampleStatus });
  });

  it("returns disabled on 404 feature_disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      }),
    );

    const result = await fetchGoodDollarStatus(apiBase, wallet);
    expect(result).toEqual({ kind: "disabled" });
  });

  it("returns explicit http error on 5xx without masking as unverified", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 503,
        ok: false,
      }),
    );

    const result = await fetchGoodDollarStatus(apiBase, wallet);
    expect(result).toMatchObject({
      kind: "error",
      code: "http",
      status: 503,
    });
    expect(result).not.toEqual({ kind: "ok", data: expect.objectContaining({ goodIdVerified: false }) });
  });

  it("returns network error on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const result = await fetchGoodDollarStatus(apiBase, wallet);
    expect(result).toMatchObject({
      kind: "error",
      code: "network",
      message: "connection refused",
    });
  });

  it("returns parse error on invalid JSON shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ wallet }),
      }),
    );

    const result = await fetchGoodDollarStatus(apiBase, wallet);
    expect(result).toMatchObject({ kind: "error", code: "parse" });
  });
});

describe("fetchGoodDollarStatusOrThrow", () => {
  it("throws GoodDollarStatusError on http failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
      }),
    );

    await expect(fetchGoodDollarStatusOrThrow(apiBase, wallet)).rejects.toBeInstanceOf(
      GoodDollarStatusError,
    );
  });

  it("returns null when feature disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      }),
    );

    await expect(fetchGoodDollarStatusOrThrow(apiBase, wallet)).resolves.toBeNull();
  });
});

describe("fetchGoodIDStatus (deprecated)", () => {
  it("throws on http error instead of silent verified:false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 503,
        ok: false,
      }),
    );

    await expect(fetchGoodIDStatus(apiBase, wallet)).rejects.toBeInstanceOf(GoodDollarStatusError);
  });
});
