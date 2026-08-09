import { describe, expect, it } from "vitest";

import { formatMoneyAmountDisplay } from "../lib/formatCollateral";

describe("formatMoneyAmountDisplay", () => {
  it("formats pUSD base units with decimals", () => {
    expect(
      formatMoneyAmountDisplay({
        amount: "10500000",
        currency: "pUSD",
        decimals: 6,
      }),
    ).toBe("10.5 pUSD");
  });

  it("returns em dash for missing value", () => {
    expect(formatMoneyAmountDisplay(null)).toBe("—");
  });
});
