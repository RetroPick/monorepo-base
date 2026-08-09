/** Display-only MoneyAmount formatter — never use for execution math. */

export type MoneyAmount = {
  amount: string;
  currency: string;
  decimals: number;
};

export function formatMoneyAmountDisplay(value: MoneyAmount | null | undefined): string {
  if (!value?.amount) return "—";
  const negative = value.amount.startsWith("-");
  const raw = negative ? value.amount.slice(1) : value.amount;
  if (!/^\d+$/.test(raw)) return "—";

  const decimals = value.decimals;
  if (decimals <= 0) {
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${negative ? "-" : ""}${formatted} ${value.currency}`;
  }

  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals) || "0";
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  const wholeFormatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const numeric = frac ? `${wholeFormatted}.${frac}` : wholeFormatted;
  return `${negative ? "-" : ""}${numeric} ${value.currency}`;
}
