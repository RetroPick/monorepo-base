/** Decimal probability parsing for display only — never use for execution math. */

export type ProbabilityParseResult =
  | { ok: true; decimal: number }
  | { ok: false; reason: "missing" | "malformed" | "non_finite" | "out_of_range" };

export function parseProbabilityDecimal(price: string | null | undefined): ProbabilityParseResult {
  if (price == null || price.trim() === "") {
    return { ok: false, reason: "missing" };
  }

  const normalized = price.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, reason: "malformed" };
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const whole = Number(wholePart);
  const fraction = fractionPart ? Number(`0.${fractionPart}`) : 0;
  const decimal = whole + fraction;

  if (!Number.isFinite(decimal)) {
    return { ok: false, reason: "non_finite" };
  }
  if (decimal < 0 || decimal > 1) {
    return { ok: false, reason: "out_of_range" };
  }

  return { ok: true, decimal };
}

export function probabilityDecimalToPercent(decimal: number): number {
  return Math.round(decimal * 1000) / 10;
}

export function formatProbabilityPercent(price: string | null | undefined): string {
  const parsed = parseProbabilityDecimal(price);
  if (!parsed.ok) return "Unavailable";
  return `${probabilityDecimalToPercent(parsed.decimal).toFixed(1)}%`;
}

export function probabilityDecimalToCardPercent(price: string | null | undefined): number | null {
  const parsed = parseProbabilityDecimal(price);
  if (!parsed.ok) return null;
  return probabilityDecimalToPercent(parsed.decimal);
}
