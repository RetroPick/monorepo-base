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
