import { formatUsdc } from "@/config/tokens";

/** Human stake-token amount shown as USD-style dollars (1 unit = $1 in UI). */
export function formatStakeUsd(raw: bigint | string | undefined | null, fractionDigits = 2): string {
  if (raw === undefined || raw === null) return "$0.00";
  const n = typeof raw === "string" ? (/^\d+$/.test(raw) ? BigInt(raw) : null) : raw;
  if (n === null || n === undefined) return "$0.00";
  const core = formatUsdc(n, fractionDigits);
  return `$${core}`;
}

export function parseStakeRaw(raw: unknown): bigint | undefined {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
  if (typeof raw === "string" && /^\d+$/.test(raw)) return BigInt(raw);
  return undefined;
}

export function sumNumericStringKey(rows: Record<string, unknown>[], key: string): bigint {
  let t = 0n;
  for (const r of rows) {
    if ("error" in r) continue;
    const v = r[key];
    const n = parseStakeRaw(v);
    if (n !== undefined) t += n;
  }
  return t;
}
