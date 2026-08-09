import { describe, expect, it } from "vitest";

import {
  computeClaimLiabilityComponentsTs,
  computeSwitchFeeTs,
  formatPayoutMultiple,
  projectedImpliedAvgPriceCents,
  projectWinnerPayoutIfSideWins,
} from "./market-payout-projection";

describe("computeClaimLiabilityComponentsTs", () => {
  it("fee on losing pool: takes bps from losing side only", () => {
    const total = 100n;
    const winning = 60n;
    const { settlementFee, distributableLosing } = computeClaimLiabilityComponentsTs(
      total,
      winning,
      1000,
      true,
    );
    expect(settlementFee).toBe(4n);
    expect(distributableLosing).toBe(36n);
  });

  it("fee on total pool: allocates fee proportionally to losers", () => {
    const total = 100n;
    const winning = 60n;
    const { settlementFee, distributableLosing } = computeClaimLiabilityComponentsTs(
      total,
      winning,
      1000,
      false,
    );
    expect(settlementFee).toBe(10n);
    expect(distributableLosing).toBe(36n);
  });

  it("handles zero losing pool", () => {
    const r = computeClaimLiabilityComponentsTs(50n, 50n, 500, true);
    expect(r.distributableLosing).toBe(0n);
  });
});

describe("computeSwitchFeeTs", () => {
  it("computes integer bps fee", () => {
    expect(computeSwitchFeeTs(10000n, 100)).toBe(100n);
    expect(computeSwitchFeeTs(0n, 100)).toBe(0n);
  });
});

describe("projectWinnerPayoutIfSideWins", () => {
  it("binary: new stake only, fee on losing", () => {
    const r = projectWinnerPayoutIfSideWins({
      outcomePools: [60n, 40n],
      totalPool: 100n,
      outcomeCount: 2,
      settlementFeeBps: 1000,
      feeOnLosingPool: true,
      refundMode: false,
      winningOutcomeIndex: 0,
      userStakes: [0n, 0n],
      additionalStake: 10n,
    });
    expect(r.basis).toBe("pool");
    expect(r.payout).toBe(15n);
  });

  it("includes existing winning stake in entitlement", () => {
    const r = projectWinnerPayoutIfSideWins({
      outcomePools: [60n, 40n],
      totalPool: 100n,
      outcomeCount: 2,
      settlementFeeBps: 1000,
      feeOnLosingPool: true,
      refundMode: false,
      winningOutcomeIndex: 0,
      userStakes: [10n, 0n],
      additionalStake: 10n,
    });
    expect(r.payout).not.toBeNull();
    const userWin = 20n;
    const winningPool = 70n;
    const losingPool = 40n;
    const fee = (losingPool * 1000n) / 10000n;
    const distributable = losingPool - fee;
    const expected = userWin + (userWin * distributable) / winningPool;
    expect(r.payout).toBe(expected);
  });

  it("returns unavailable when refundMode", () => {
    const r = projectWinnerPayoutIfSideWins({
      outcomePools: [50n, 50n],
      totalPool: 100n,
      outcomeCount: 2,
      settlementFeeBps: 0,
      feeOnLosingPool: true,
      refundMode: true,
      winningOutcomeIndex: 0,
      userStakes: [0n, 0n],
      additionalStake: 10n,
    });
    expect(r.basis).toBe("unavailable");
    expect(r.payout).toBeNull();
  });

  it("never exceeds post-deposit pool (totalPool + additionalStake)", () => {
    const r = projectWinnerPayoutIfSideWins({
      outcomePools: [60n, 40n],
      totalPool: 100n,
      outcomeCount: 2,
      settlementFeeBps: 1000,
      feeOnLosingPool: true,
      refundMode: false,
      winningOutcomeIndex: 0,
      userStakes: [0n, 0n],
      additionalStake: 10n,
    });
    expect(r.payout).not.toBeNull();
    expect(r.payout!).toBeLessThanOrEqual(110n);
  });
});

describe("projectedImpliedAvgPriceCents & formatPayoutMultiple", () => {
  it("formats implied avg price after deposit", () => {
    const p = projectedImpliedAvgPriceCents({
      outcomePools: [60n, 40n],
      totalPool: 100n,
      outcomeCount: 2,
      winningOutcomeIndex: 0,
      additionalStake: 10n,
    });
    expect(p).toBe("63.6¢");
  });

  it("formats payout multiple", () => {
    expect(formatPayoutMultiple(151n, 100n)).toBe("1.51");
  });
});
