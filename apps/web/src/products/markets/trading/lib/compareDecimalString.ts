/** Lexicographic decimal string compare without floating point. Returns -1, 0, or 1. */
export function compareDecimalString(a: string, b: string): number {
  const normA = normalizeDecimal(a);
  const normB = normalizeDecimal(b);
  if (normA.whole.length !== normB.whole.length) {
    return normA.whole.length < normB.whole.length ? -1 : 1;
  }
  if (normA.whole !== normB.whole) {
    return normA.whole < normB.whole ? -1 : 1;
  }
  const fracCmp = normA.frac.localeCompare(normB.frac);
  if (fracCmp !== 0) return fracCmp < 0 ? -1 : 1;
  return 0;
}

function normalizeDecimal(value: string): { whole: string; frac: string } {
  const trimmed = value.trim();
  if (!trimmed) return { whole: "0", frac: "" };
  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const frac = fracRaw.replace(/0+$/, "");
  return { whole, frac };
}

export function isDecimalGte(a: string, b: string): boolean {
  return compareDecimalString(a, b) >= 0;
}

export function isDecimalLte(a: string, b: string): boolean {
  return compareDecimalString(a, b) <= 0;
}
