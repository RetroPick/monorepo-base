/** Decimal-safe display helpers — never use for execution math. */

const PRICE_DISPLAY_FRACTION = 4;
const SIZE_DISPLAY_FRACTION = 2;
const PERCENT_FRACTION = 1;

export function formatDecimalDisplay(value: string | null | undefined, maxFraction = 4): string {
  if (value == null || value === "") return "—";
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [whole, frac = ""] = raw.split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) return value;
  const trimmed = frac.slice(0, maxFraction).replace(/0+$/, "");
  const formatted = trimmed ? `${whole}.${trimmed}` : whole;
  return negative ? `-${formatted}` : formatted;
}

export function formatPrice(value: string | null | undefined): string {
  return formatDecimalDisplay(value, PRICE_DISPLAY_FRACTION);
}

export function formatSize(value: string | null | undefined): string {
  return formatDecimalDisplay(value, SIZE_DISPLAY_FRACTION);
}

export function formatProbability(price: string | null | undefined): string {
  if (price == null || price === "") return "—";
  const parts = price.split(".");
  const whole = Number(parts[0]);
  const frac = parts[1] ? Number(`0.${parts[1]}`) : 0;
  if (Number.isNaN(whole)) return formatPrice(price);
  const pct = (whole + frac) * 100;
  return `${pct.toFixed(PERCENT_FRACTION)}%`;
}

export function compareDecimalStrings(a: string, b: string): number {
  const normalize = (s: string) => {
    const [w, f = ""] = s.replace(/^-/, "").split(".");
    return { sign: s.startsWith("-") ? -1 : 1, w: w.padStart(20, "0"), f: f.padEnd(20, "0") };
  };
  const na = normalize(a);
  const nb = normalize(b);
  if (na.sign !== nb.sign) return na.sign < nb.sign ? -1 : 1;
  if (na.w !== nb.w) return na.w < nb.w ? -1 : 1;
  if (na.f !== nb.f) return na.f < nb.f ? -1 : 1;
  return 0;
}
