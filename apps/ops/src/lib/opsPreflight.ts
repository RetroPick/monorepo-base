/** Pure helpers for ops “deploy / prepare” preflight UI. */

export function indexerLagBlocks(chainHead: bigint, lastIndexedBlock: number): bigint {
  return chainHead - BigInt(lastIndexedBlock);
}

export type LagBand = "ok" | "warn" | "stale";

/** Rough bands: ~1 epoch on Base ≈ 2s target; warn before “very behind”. */
export function lagBand(lag: bigint): LagBand {
  if (lag < 0n) return "stale";
  if (lag <= 32n) return "ok";
  if (lag <= 256n) return "warn";
  return "stale";
}
