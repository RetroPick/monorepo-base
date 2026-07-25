import { describe, expect, it } from "vitest";
import { isValidAssetClassParam, parseAssetClassParam } from "./asset-class-params";

describe("parseAssetClassParam", () => {
  it("defaults undefined to crypto", () => {
    expect(parseAssetClassParam(undefined)).toBe("crypto");
  });

  it("parses valid lowercase ids", () => {
    expect(parseAssetClassParam("FX")).toBe("fx");
    expect(parseAssetClassParam("weather")).toBe("weather");
  });

  it("falls back to crypto for unknown segments", () => {
    expect(parseAssetClassParam("invalid-class")).toBe("crypto");
  });
});

describe("isValidAssetClassParam", () => {
  it("returns false for invalid", () => {
    expect(isValidAssetClassParam("nope")).toBe(false);
  });

  it("returns true for valid", () => {
    expect(isValidAssetClassParam("benchmarks")).toBe(true);
  });
});
