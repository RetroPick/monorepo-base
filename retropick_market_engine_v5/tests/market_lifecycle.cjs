const assert = require("node:assert/strict");

const marketEngine = require("./helpers/marketEngine");
const pyth = require("./helpers/pyth");

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
  feedIdHexToBytes,
  fetchLatestPriceUpdate,
  postPriceUpdateAndConsume,
} = pyth;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("market lifecycle", function () {
  this.timeout(120_000);

  it("runs open -> deposit -> lock -> resolve -> claim -> withdraw fees with posted Pyth updates", async () => {
    const latestUpdate = await fetchLatestPriceUpdate(
      process.env.PYTH_TEST_FEED_ID ?? pyth.DEFAULT_BTC_USD_FEED_ID
    );
    const slugSuffix = `${Date.now()}`.slice(-8);
    const now = Math.floor(Date.now() / 1000);
    const winningOutcome = 0;
    const losingOutcome = 1;
    const market = await bootstrapMarketContext(
      {
        slug: `btc-pyth-${slugSuffix}`,
        assetSymbol: "BTC",
        oracleFeedId: feedIdHexToBytes(latestUpdate.feedId),
        marketType: 1,
        condition: 0,
        thresholdRule: 1,
        outcomeCount: 2,
        absoluteThresholdValueE8: 0,
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
          lockAt: now + 15,
          resolveAt: now + 30,
        },
      }
    );

    const winnerOne = await createUserContext(market);
    const winnerTwo = await createUserContext(market);
    const loser = await createUserContext(market);

    await sendIx(winnerOne.provider, [depositToSideIx(winnerOne, winningOutcome, 1_000_000n)], [
      winnerOne.user,
    ]);
    await sendIx(winnerTwo.provider, [depositToSideIx(winnerTwo, winningOutcome, 2_000_000n)], [
      winnerTwo.user,
    ]);
    await sendIx(loser.provider, [depositToSideIx(loser, losingOutcome, 100_000_000n)], [loser.user]);

    await sleep(16_000);
    const lockUpdate = await fetchLatestPriceUpdate(latestUpdate.feedId);
    await postPriceUpdateAndConsume({
      provider: market.provider,
      update: lockUpdate,
      makeConsumerInstruction: (priceUpdate) => lockEpochIx(market, priceUpdate),
    });

    await sleep(16_000);
    const resolveUpdate = await fetchLatestPriceUpdate(latestUpdate.feedId);
    await postPriceUpdateAndConsume({
      provider: market.provider,
      update: resolveUpdate,
      makeConsumerInstruction: (priceUpdate) => resolveEpochIx(market, priceUpdate),
    });

    const epoch = await decodeEpoch(market.provider.connection, market.epoch);
    assert.equal(epoch.claimable, true);
    assert.equal(epoch.refundMode, false);
    assert.equal(epoch.winningOutcomeMask, 1n);
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
