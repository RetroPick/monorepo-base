import { afterEach, describe, expect, it } from "vitest";

import { getProductMode, isLegacyEnabled, isMarketsEnabled } from "./product";

describe("product mode", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PRODUCT;
  });

  it("defaults to legacy when unset", () => {
    expect(getProductMode()).toBe("legacy");
    expect(isLegacyEnabled()).toBe(true);
    expect(isMarketsEnabled()).toBe(false);
  });

  it("enables markets only for markets deploy", () => {
    process.env.NEXT_PUBLIC_PRODUCT = "markets";
    expect(getProductMode()).toBe("markets");
    expect(isMarketsEnabled()).toBe(true);
    expect(isLegacyEnabled()).toBe(false);
  });
});
