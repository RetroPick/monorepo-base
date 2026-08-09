import { describe, expect, it } from "vitest";

import { computeContentHash, contentHashMatches } from "../lib/computeContentHash";

describe("computeContentHash", () => {
  it("matches backend golden vector buy_limit_standard", async () => {
    const payload = {
      salt: "4242424242424242",
      maker: "0x1111111111111111111111111111111111111111",
      signer: "0x2222222222222222222222222222222222222222",
      tokenId: "999001",
      makerAmount: "100000000",
      takerAmount: "42000000",
      side: 0,
      signatureType: 0,
      timestamp: "1710000000000",
      metadata: "",
      builder: "0000000000000000000000000000000000000000000000000000000000000001",
    };
    const metadata = {
      chainId: 137,
      marketId: "polymarket:market:456",
      tokenId: "999001",
    };
    const hash = await computeContentHash(payload, metadata);
    expect(hash).toBe("0xa92a6e06d6c6288cd6ba191dfe378f5f62c27f6692c7b3ccd4cc9e6d099080de");
    expect(contentHashMatches(hash, "0xa92a6e06d6c6288cd6ba191dfe378f5f62c27f6692c7b3ccd4cc9e6d099080de")).toBe(
      true,
    );
  });
});
