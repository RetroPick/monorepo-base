import { describe, expect, it } from "vitest";

import { indexerLagBlocks, lagBand } from "./opsPreflight";

describe("indexerLagBlocks", () => {
  it("subtracts last indexed from chain head", () => {
    expect(indexerLagBlocks(100n, 70)).toBe(30n);
  });
});

describe("lagBand", () => {
  it("flags negative lag as stale", () => {
    expect(lagBand(-1n)).toBe("stale");
  });
  it("ok within a few blocks", () => {
    expect(lagBand(0n)).toBe("ok");
    expect(lagBand(32n)).toBe("ok");
  });
  it("warns for moderate drift", () => {
    expect(lagBand(33n)).toBe("warn");
    expect(lagBand(256n)).toBe("warn");
  });
  it("stale for large drift", () => {
    expect(lagBand(257n)).toBe("stale");
  });
});
