/**
 * Display multiple for gross return on a $1 stake if the side wins,
 * assuming the shown % is the implied probability (same convention as many prediction UIs).
 * multiplier ≈ 100 / impliedPercent (e.g. 40% → 2.50x).
 */
export function formatPayoutMultiplier(impliedPercent: number): string {
  if (!Number.isFinite(impliedPercent) || impliedPercent <= 0 || impliedPercent >= 100) {
    return "—";
  }
  const m = 100 / impliedPercent;
  const decimals = m >= 10 ? 1 : 2;
  return `${m.toFixed(decimals)}x`;
}
