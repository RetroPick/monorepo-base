import { describe, expect, it } from "vitest";

import { FORBIDDEN_CUSTODY_PATTERNS, MARKETS_CUSTODY_INVARIANT } from "../lib/custodyInvariants";
import { truncateAddress } from "../lib/truncateAddress";
import { POLYGON_CHAIN_ID } from "../config/chains";

describe("custodyInvariants", () => {
  it("exports greppable MARKETS_CUSTODY marker", () => {
    expect(MARKETS_CUSTODY_INVARIANT).toContain("MARKETS_CUSTODY");
    expect(MARKETS_CUSTODY_INVARIANT).toContain("ADR-003");
  });

  it("defines forbidden custody patterns", () => {
    expect(FORBIDDEN_CUSTODY_PATTERNS.length).toBeGreaterThan(0);
  });
});

describe("truncateAddress", () => {
  it("shortens long addresses", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    expect(truncateAddress(addr)).toBe("0x1234…5678");
  });
});

describe("chains", () => {
  it("uses Polygon mainnet id", () => {
    expect(POLYGON_CHAIN_ID).toBe(137);
  });
});
