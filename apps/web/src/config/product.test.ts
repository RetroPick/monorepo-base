import { describe, expect, it } from "vitest";

import { getProductMode, isMarketsEnabled, isPrismEnabled } from "./product";

describe("product mode", () => {
  it("defaults to markets", () => {
    expect(getProductMode()).toBe("markets");
    expect(isMarketsEnabled()).toBe(true);
    expect(isPrismEnabled()).toBe(false);
  });
});
