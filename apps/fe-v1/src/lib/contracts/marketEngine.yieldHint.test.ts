import { describe, expect, it } from "vitest";
import { buildYieldAmountHintLines, type TemplateYieldView } from "./marketEngine";

const baseView = (over: Partial<TemplateYieldView>): TemplateYieldView => ({
  routerAssigned: true,
  routerDisabled: false,
  recoveryPending: false,
  yieldPath: 0,
  currentPrincipal: 100n * 10n ** 18n,
  currentValue: 104n * 10n ** 18n,
  unrealizedYieldAmount: 4n * 10n ** 18n,
  yieldRatioE6: 40_000n,
  scaledPrincipal: 0n,
  stataShares: 0n,
  yieldFeeBpsCurrent: 100,
  ...over,
});

describe("buildYieldAmountHintLines", () => {
  it("includes unrealized yield percent when principal and ratio are non-zero", () => {
    const lines = buildYieldAmountHintLines("add", baseView({}), { isLoading: false, isError: false });
    expect(lines.some((l) => l.includes("~4.00%"))).toBe(true);
    expect(lines.some((l) => l.includes("Protocol yield fee"))).toBe(true);
    expect(lines.some((l) => l.includes("Bigger stakes"))).toBe(true);
  });

  it("is silent when no yield router is configured", () => {
    const lines = buildYieldAmountHintLines(
      "add",
      baseView({ routerAssigned: false }),
      { isLoading: false, isError: false },
    );
    expect(lines).toEqual([]);
  });

  it("uses fallback copy when loading", () => {
    const lines = buildYieldAmountHintLines("add", undefined, { isLoading: true, isError: false });
    expect(lines[0]).toMatch(/Checking yield routing/i);
  });
});
