import { describe, expect, it } from "vitest";

import {
  STAKE_TOKEN_DECIMALS,
  STAKE_TOKEN_SYMBOL,
  formatUsdc,
  parseUsdc,
  tryGetStakeTokenAddress,
} from "./tokens";
import { DEPLOYMENT_CHAIN_ID } from "./chains";

describe("stake token config", () => {
  it("uses packages/legacy/abi/address.md MockERC20 metadata on the registry chain", () => {
    expect(STAKE_TOKEN_SYMBOL).toBe("mSTK");
    expect(STAKE_TOKEN_DECIMALS).toBe(18);
    expect(tryGetStakeTokenAddress(DEPLOYMENT_CHAIN_ID)).toBe(
      "0xb7f49377af6adbef64f513cf04dbdac9d0af01b1",
    );
  });

  it("parses and formats registry stake-token units with 18 decimals", () => {
    expect(parseUsdc("3")).toBe(3_000_000_000_000_000_000n);
    expect(parseUsdc("0.25")).toBe(250_000_000_000_000_000n);
    expect(formatUsdc(1_000_000_000_000_000_000_000n)).toBe("1,000.00");
  });
});
