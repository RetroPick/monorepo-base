/** Which product surfaces this web build exposes. Set via NEXT_PUBLIC_PRODUCT. */
export type ProductMode = "markets" | "prism" | "legacy" | "all";

const VALID: ProductMode[] = ["markets", "prism", "legacy", "all"];

export function getProductMode(): ProductMode {
  const raw = process.env.NEXT_PUBLIC_PRODUCT?.toLowerCase();
  if (raw && (VALID as string[]).includes(raw)) {
    return raw as ProductMode;
  }
  /** Default legacy until Markets V1 replaces the main shell. */
  return "legacy";
}

export function isMarketsEnabled(mode: ProductMode = getProductMode()): boolean {
  return mode === "markets" || mode === "all";
}

export function isPrismEnabled(mode: ProductMode = getProductMode()): boolean {
  return mode === "prism" || mode === "all";
}

export function isLegacyEnabled(mode: ProductMode = getProductMode()): boolean {
  return mode === "legacy" || mode === "all";
}
