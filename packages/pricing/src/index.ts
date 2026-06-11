export type PoolProjectionBasis = "pool" | "unavailable";

export type WinnerPayoutProjection = {
  payout: bigint | null;
  basis: PoolProjectionBasis;
};

export function clampBps(value: number): bigint {
  return BigInt(Math.max(0, Math.min(65535, Number.isFinite(value) ? Math.trunc(value) : 0)));
}

export function computeClaimLiabilityComponents(
  totalPool: bigint,
  winningPool: bigint,
  settlementFeeBps: number,
  feeOnLosingPool: boolean,
): { settlementFee: bigint; distributableLosing: bigint } {
  if (totalPool < winningPool || winningPool < 0n || totalPool < 0n) {
    return { settlementFee: 0n, distributableLosing: 0n };
  }
  const losingPool = totalPool - winningPool;
  const bps = clampBps(settlementFeeBps);

  if (feeOnLosingPool) {
    const settlementFee = (losingPool * bps) / 10000n;
    const distributableLosing = losingPool > settlementFee ? losingPool - settlementFee : 0n;
    return { settlementFee, distributableLosing };
  }

  const settlementFee = (totalPool * bps) / 10000n;
  if (totalPool === 0n) return { settlementFee: 0n, distributableLosing: 0n };

  const feeAllocToLosers = (settlementFee * losingPool) / totalPool;
  const distributableLosing = losingPool > feeAllocToLosers ? losingPool - feeAllocToLosers : 0n;
  return { settlementFee, distributableLosing };
}

export function computeSwitchFee(grossAmount: bigint, switchFeeBps: number): bigint {
  if (grossAmount <= 0n) return 0n;
  return (grossAmount * clampBps(switchFeeBps)) / 10000n;
}

export type ProjectWinnerPayoutArgs = {
  outcomePools: readonly bigint[];
  totalPool: bigint;
  outcomeCount: number;
  settlementFeeBps: number;
  feeOnLosingPool: boolean;
  refundMode: boolean;
  winningOutcomeIndex: number;
  userStakes: readonly bigint[];
  additionalStake: bigint;
};

export function projectWinnerPayoutIfSideWins(
  args: ProjectWinnerPayoutArgs,
): WinnerPayoutProjection {
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

  const poolsPrime = pools.map((pool, index) =>
    index === winningOutcomeIndex ? pool + additionalStake : pool,
  );
  const totalPrime = totalPool + additionalStake;
  const winningPool = poolsPrime[winningOutcomeIndex] ?? 0n;
  if (winningPool === 0n) return { payout: null, basis: "unavailable" };

  const losingPool = totalPrime - winningPool;
  if (losingPool < 0n) return { payout: null, basis: "unavailable" };

  const { distributableLosing } = computeClaimLiabilityComponents(
    totalPrime,
    winningPool,
    settlementFeeBps,
    feeOnLosingPool,
  );

  const userWin = (stakes[winningOutcomeIndex] ?? 0n) + additionalStake;
  if (userWin === 0n) return { payout: null, basis: "unavailable" };

  const share = (userWin * distributableLosing) / winningPool;
  const entitlementRaw = userWin + share;
  return { payout: entitlementRaw > totalPrime ? totalPrime : entitlementRaw, basis: "pool" };
}

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

export function formatPayoutMultiple(cappedPayout: bigint, marginalStake: bigint): string {
  if (marginalStake <= 0n || cappedPayout <= 0n) return "-";
  const mult100 = (cappedPayout * 100n) / marginalStake;
  const n = Number(mult100) / 100;
  if (!Number.isFinite(n) || n < 0.01) return "<0.01";
  return n >= 10 ? n.toFixed(1) : n.toFixed(2);
}

export function formatProbabilityPercent(probability: number, digits = 0): string {
  const p = Math.max(0, Math.min(100, Number.isFinite(probability) ? probability : 0));
  return `${p.toFixed(Math.max(0, Math.min(4, Math.trunc(digits))))}%`;
}
