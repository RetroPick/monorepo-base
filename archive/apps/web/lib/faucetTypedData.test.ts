import { describe, expect, it } from "vitest";

import { buildFaucetMintSignRequest } from "./faucetTypedData";

describe("buildFaucetMintSignRequest", () => {
  it("matches TokenFaucet EIP-712 domain and MintRequest fields", () => {
    const req = buildFaucetMintSignRequest({
      chainId: 84532,
      faucetAddress: "0xf6c1b6bddd06972f08772de7954432e10c853231",
      recipient: "0x0000000000000000000000000000000000000001",
      amount: 1000n * 10n ** 18n,
      nonce: 0n,
      deadline: 2_000_000_000n,
    });
    expect(req.domain.name).toBe("TokenFaucet");
    expect(req.domain.version).toBe("1");
    expect(req.domain.chainId).toBe(84532n);
    expect(req.domain.verifyingContract).toBe("0xf6c1b6bddd06972f08772de7954432e10c853231");
    expect(req.primaryType).toBe("MintRequest");
    expect(req.message.recipient).toBe("0x0000000000000000000000000000000000000001");
    expect(req.message.amount).toBe(1000n * 10n ** 18n);
    expect(req.message.nonce).toBe(0n);
    expect(req.message.deadline).toBe(2_000_000_000n);
    expect(req.types.MintRequest.map((f) => f.type).join(",")).toBe("address,uint256,uint256,uint64");
  });
});
