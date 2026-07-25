/** Which product surfaces this web build exposes. Set via NEXT_PUBLIC_PRODUCT. */
export type ProductMode = "markets" | "prism";

const VALID: ProductMode[] = ["markets", "prism"];

export function getProductMode(): ProductMode {
  const raw = process.env.NEXT_PUBLIC_PRODUCT?.toLowerCase();
  if (raw && (VALID as string[]).includes(raw)) {
    return raw as ProductMode;
  }
  return "markets";
}

export function isMarketsEnabled(mode: ProductMode = getProductMode()): boolean {
  return mode === "markets";
}

export function isPrismEnabled(mode: ProductMode = getProductMode()): boolean {
  return mode === "prism";
}
