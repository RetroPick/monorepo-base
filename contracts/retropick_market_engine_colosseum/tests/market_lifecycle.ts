import { strict as assert } from "node:assert";

import * as marketEngine from "./helpers/marketEngine.ts";
import * as pyth from "./helpers/pyth.ts";

const {
  bootstrapMarketContext,
  claimIx,
  createUserContext,
  decodeEpoch,
  decodeLedger,
  decodePosition,
  lockEpochIx,
  resolveEpochIx,
  depositToSideIx,
  sendIx,
  tokenAmount,
  withdrawFeesIx,
} = marketEngine;
const {
  DEFAULT_BTC_USD_FEED_ID,
  feedIdHexToBytes,
  findHistoricalDirectionScenario,
  postPriceUpdateAndConsume,
} = pyth;

describe("market lifecycle", function () {
  this.timeout(120_000);

  it("runs open -> deposit -> lock -> resolve -> claim -> withdraw fees with posted Pyth updates", async () => {
    const scenario = await findHistoricalDirectionScenario(
      process.env.PYTH_TEST_FEED_ID ?? DEFAULT_BTC_USD_FEED_ID
    );
    const losingOutcome = scenario.winningOutcome === 0 ? 1 : 0;
    const slugSuffix = `${Date.now()}`.slice(-8);
    const market = await bootstrapMarketContext(
      {
        slug: `btc-pyth-${slugSuffix}`,
        assetSymbol: "BTC",
        oracleFeedId: feedIdHexToBytes(scenario.start.feedId),
        marketType: 0,
        condition: 0,
        thresholdRule: 0,
        outcomeCount: 2,
        switchFeeBps: 200,
        settlementFeeBps: 500,
        allowMultiSidePositions: true,
      },
      {
        bootstrap: {
          oracleMaxDelaySeconds: 28_800,
          oracleMaxConfidenceBps: 10_000,
        },
        epochTiming: {
          openAt: 0,
          lockAt: scenario.start.price.publishTime,
          resolveAt: scenario.end.price.publishTime,
        },
      }
    );

    const winnerOne = await createUserContext(market);
    const winnerTwo = await createUserContext(market);
    const loser = await createUserContext(market);

    await sendIx(winnerOne.provider, [depositToSideIx(winnerOne, scenario.winningOutcome, 1_000_000n)], [
      winnerOne.user,
    ]);
    await sendIx(winnerTwo.provider, [depositToSideIx(winnerTwo, scenario.winningOutcome, 2_000_000n)], [
      winnerTwo.user,
    ]);
    await sendIx(loser.provider, [depositToSideIx(loser, losingOutcome, 100_000_000n)], [loser.user]);

    await postPriceUpdateAndConsume({
      provider: market.provider,
      update: scenario.start,
      makeConsumerInstruction: (priceUpdate) => lockEpochIx(market, priceUpdate),
    });

    await postPriceUpdateAndConsume({
      provider: market.provider,
      update: scenario.end,
      makeConsumerInstruction: (priceUpdate) => resolveEpochIx(market, priceUpdate),
    });

    const epoch = await decodeEpoch(market.provider.connection, market.epoch);
    assert.equal(epoch.claimable, true);
    assert.equal(epoch.refundMode, false);
    assert.equal(epoch.winningOutcomeMask, BigInt(1 << scenario.winningOutcome));
    assert.equal(epoch.claimLiabilityTotal, 98_000_000n);
    assert.equal(epoch.settlementFeeTotal, 5_000_000n);

    const claimsVaultBeforeClaims = await tokenAmount(market.provider.connection, market.claimsVault);
    const feeVaultBeforeWithdraw = await tokenAmount(market.provider.connection, market.feeVault);
    assert.equal(claimsVaultBeforeClaims, 98_000_000n);
    assert.equal(feeVaultBeforeWithdraw, 5_000_000n);

    await sendIx(winnerOne.provider, [claimIx(winnerOne)], [winnerOne.user]);
    const winnerOnePosition = await decodePosition(market.provider.connection, winnerOne.position);
    assert.equal(winnerOnePosition.claimed, true);
    assert.equal(winnerOnePosition.claimedAmount, 32_666_666n);

    await sendIx(winnerTwo.provider, [claimIx(winnerTwo)], [winnerTwo.user]);
    const winnerTwoPosition = await decodePosition(market.provider.connection, winnerTwo.position);
    assert.equal(winnerTwoPosition.claimed, true);
    assert.equal(winnerTwoPosition.claimedAmount, 65_333_334n);

    const claimsVaultAfterClaims = await tokenAmount(market.provider.connection, market.claimsVault);
    assert.equal(claimsVaultAfterClaims, 0n);

    const ledgerAfterClaims = await decodeLedger(market.provider.connection, market.ledger);
    assert.equal(ledgerAfterClaims.claimsReserveTotal, 0n);
    assert.equal(ledgerAfterClaims.feeReserveTotal, 5_000_000n);

    const treasuryBeforeWithdraw = await tokenAmount(
      market.provider.connection,
      market.treasuryTokenAccount
    );
    await sendIx(market.provider, [withdrawFeesIx(market, 5_000_000n)], [market.admin]);
    const treasuryAfterWithdraw = await tokenAmount(
      market.provider.connection,
      market.treasuryTokenAccount
    );
    assert.equal(treasuryAfterWithdraw - treasuryBeforeWithdraw, 5_000_000n);

    const feeVaultAfterWithdraw = await tokenAmount(market.provider.connection, market.feeVault);
    assert.equal(feeVaultAfterWithdraw, 0n);

    const ledgerAfterWithdraw = await decodeLedger(market.provider.connection, market.ledger);
    assert.equal(ledgerAfterWithdraw.feeReserveTotal, 0n);
  });
});
