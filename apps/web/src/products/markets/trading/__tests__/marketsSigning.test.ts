import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveMarketsTypedDataSigner } from "../lib/marketsSigning";

describe("resolveMarketsTypedDataSigner", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("always calls the user's wallet signer outside explicitly enabled E2E mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETS_E2E_TEST_MODE", "");
    const walletSigner = vi.fn().mockResolvedValue("0xwallet");

    const signature = await resolveMarketsTypedDataSigner(walletSigner, "0xharness")({ orderId: "order-1" });

    expect(signature).toBe("0xwallet");
    expect(walletSigner).toHaveBeenCalledWith({ orderId: "order-1" });
  });

  it("permits the injected E2E signer only in explicitly enabled E2E mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKETS_E2E_TEST_MODE", "1");
    const walletSigner = vi.fn().mockResolvedValue("0xwallet");

    const signature = await resolveMarketsTypedDataSigner(walletSigner, "0xharness")({ orderId: "order-1" });

    expect(signature).toBe("0xharness");
    expect(walletSigner).not.toHaveBeenCalled();
  });
});
