/**
 * Client-side payout projection aligned with MarketMath.computeClaimPayoutStorage /
 * computeClaimLiabilityComponents (RetroPick MarketEngine). Used for “Win up to” UX only;
 * last-claimer dust is not modeled (see docs).
 */

export type PoolProjectionBasis = "pool" | "unavailable";

export type WinnerPayoutProjection = {
  payout: bigint | null;
  basis: PoolProjectionBasis;
};

/**
 * Mirrors Solidity `computeClaimLiabilityComponents(totalPool, winningPool, settlementFeeBps, feeOnLosingPool)`.
 * `losingPool = totalPool - winningPool`.
 */
export function computeClaimLiabilityComponentsTs(
  totalPool: bigint,
  winningPool: bigint,
  settlementFeeBps: number,
  feeOnLosingPool: boolean,
): { settlementFee: bigint; distributableLosing: bigint } {
  if (totalPool < winningPool || winningPool < 0n || totalPool < 0n) {
    return { settlementFee: 0n, distributableLosing: 0n };
  }
  const losingPool = totalPool - winningPool;
  const bps = BigInt(Math.max(0, Math.min(65535, settlementFeeBps)));

  if (feeOnLosingPool) {
    const settlementFee = (losingPool * bps) / 10000n;
    const distributableLosing = losingPool > settlementFee ? losingPool - settlementFee : 0n;
    return { settlementFee, distributableLosing };
  }

  const settlementFee = (totalPool * bps) / 10000n;
  if (totalPool === 0n) {
    return { settlementFee: 0n, distributableLosing: 0n };
  }
  const feeAllocToLosers = (settlementFee * losingPool) / totalPool;
  const distributableLosing = losingPool > feeAllocToLosers ? losingPool - feeAllocToLosers : 0n;
  return { settlementFee, distributableLosing };
}

export function computeSwitchFeeTs(grossAmount: bigint, switchFeeBps: number): bigint {
  if (grossAmount <= 0n) return 0n;
  const bps = BigInt(Math.max(0, Math.min(65535, switchFeeBps)));
  return (grossAmount * bps) / 10000n;
}

export type ProjectWinnerPayoutArgs = {
  outcomePools: readonly bigint[];
  totalPool: bigint;
  outcomeCount: number;
  settlementFeeBps: number;
  feeOnLosingPool: boolean;
  refundMode: boolean;
  /** Outcome index assumed to win */
  winningOutcomeIndex: number;
  /** Current user stakes per outcome (same length as pools slice) */
  userStakes: readonly bigint[];
  /** Hypothetical additional stake on winningOutcomeIndex */
  additionalStake: bigint;
};

/**
 * If `winningOutcomeIndex` wins after adding `additionalStake` there, estimated entitlement
 * (excluding last-claimer remainder): userWin + userWin * distributableLosing / winningPool.
 */
export function projectWinnerPayoutIfSideWins(args: ProjectWinnerPayoutArgs): WinnerPayoutProjection {
  const {
    outcomePools,
    totalPool,
    outcomeCount,
    settlementFeeBps,
    feeOnLosingPool,
    refundMode,
    winningOutcomeIndex,
    userStakes,
    additionalStake,
  } = args;

  if (refundMode || outcomeCount <= 0 || winningOutcomeIndex < 0 || winningOutcomeIndex >= outcomeCount) {
    return { payout: null, basis: "unavailable" };
  }
  if (additionalStake < 0n) return { payout: null, basis: "unavailable" };

  const pools = outcomePools.slice(0, outcomeCount);
  while (pools.length < outcomeCount) pools.push(0n);

  const stakes = userStakes.slice(0, outcomeCount);
  while (stakes.length < outcomeCount) stakes.push(0n);

  const poolsPrime = pools.map((p, i) => (i === winningOutcomeIndex ? p + additionalStake : p));
  const totalPrime = totalPool + additionalStake;
  const winningPool = poolsPrime[winningOutcomeIndex] ?? 0n;
  if (winningPool === 0n) {
    return { payout: null, basis: "unavailable" };
  }

  const losingPool = totalPrime - winningPool;
  if (losingPool < 0n) {
    return { payout: null, basis: "unavailable" };
  }

  const { distributableLosing } = computeClaimLiabilityComponentsTs(
    totalPrime,
    winningPool,
    settlementFeeBps,
    feeOnLosingPool,
  );

  const userWin = (stakes[winningOutcomeIndex] ?? 0n) + additionalStake;
  if (userWin === 0n) {
    return { payout: null, basis: "unavailable" };
  }

  const share = (userWin * distributableLosing) / winningPool;
  const entitlementRaw = userWin + share;
  /** No payout can exceed the post-deposit pool (all USDC in the epoch). */
  const entitlement = entitlementRaw > totalPrime ? totalPrime : entitlementRaw;

  return { payout: entitlement, basis: "pool" };
}

/**
 * Implied “avg. price” for the selected outcome after the hypothetical deposit:
 * `(winningPool + additionalStake) / (totalPool + additionalStake)` in cents (0–100), one decimal.
 */
export function projectedImpliedAvgPriceCents(args: {
  outcomePools: readonly bigint[];
  totalPool: bigint;
  outcomeCount: number;
  winningOutcomeIndex: number;
  additionalStake: bigint;
}): string | null {
  const { outcomePools, totalPool, outcomeCount, winningOutcomeIndex, additionalStake } = args;
  if (outcomeCount <= 0 || winningOutcomeIndex < 0 || winningOutcomeIndex >= outcomeCount) return null;
  const pools = outcomePools.slice(0, outcomeCount);
  while (pools.length < outcomeCount) pools.push(0n);
  const totalPrime = totalPool + additionalStake;
  if (totalPrime <= 0n) return null;
  const winPool = (pools[winningOutcomeIndex] ?? 0n) + additionalStake;
  const bps = (winPool * 1000n) / totalPrime;
  const centsOneDecimal = Number(bps) / 10;
  if (!Number.isFinite(centsOneDecimal)) return null;
  return `${centsOneDecimal.toFixed(1)}¢`;
}

/** Return multiple capped payout / marginal stake for UX (floor at 0.01×). */
export function formatPayoutMultiple(cappedPayout: bigint, marginalStake: bigint): string {
  if (marginalStake <= 0n || cappedPayout <= 0n) return "-";
  const mult100 = (cappedPayout * 100n) / marginalStake;
  const n = Number(mult100) / 100;
  if (!Number.isFinite(n) || n < 0.01) return "<0.01";
  return n >= 10 ? n.toFixed(1) : n.toFixed(2);
}

function toBigField(raw: unknown): bigint {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
  if (typeof raw === "string" && /^\d+$/.test(raw)) return BigInt(raw);
  return 0n;
}

/** Fields from `getEpoch` / MarketTypes.Epoch for projection + switch fee display */
export type EpochProjectionSnapshot = {
  outcomePools: readonly bigint[];
  totalPool: bigint;
  outcomeCount: number;
  settlementFeeBps: number;
  feeOnLosingPool: boolean;
  refundMode: boolean;
  switchFeeBps: number;
};

/** Narrow read of wagmi `getEpoch` tuple object */
export function parseEpochForProjection(raw: unknown): EpochProjectionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const poolsRaw = r.outcomePools;
  if (!Array.isArray(poolsRaw)) return null;
  const outcomeCount = Number(r.outcomeCount);
  if (!Number.isFinite(outcomeCount) || outcomeCount <= 0 || outcomeCount > 8) return null;

  const outcomePools = poolsRaw.slice(0, outcomeCount).map((p) => toBigField(p));
  const totalPool = toBigField(r.totalPool);

  return {
    outcomePools,
    totalPool,
    outcomeCount,
    settlementFeeBps: Number(r.settlementFeeBps ?? 0),
    feeOnLosingPool: Boolean(r.feeOnLosingPool),
    refundMode: Boolean(r.refundMode),
    switchFeeBps: Number(r.switchFeeBps ?? 0),
  };
}
