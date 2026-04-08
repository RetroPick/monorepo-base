const assert = require("node:assert/strict");

const marketEngine = require("./helpers/marketEngine");
const pyth = require("./helpers/pyth");

const { bootstrapMarketContext, expectFailure, lockEpochIx } = marketEngine;
const {
  DEFAULT_BTC_USD_FEED_ID,
  feedIdHexToBytes,
  fetchLatestPriceUpdate,
  postPriceUpdateAndConsume,
} = pyth;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("pyth confidence flow", function () {
  this.timeout(60_000);

  it("rejects a posted PriceUpdateV2 when confidence exceeds the configured tolerance", async () => {
    const feedId = process.env.PYTH_TEST_FEED_ID ?? DEFAULT_BTC_USD_FEED_ID;
    const update = await fetchLatestPriceUpdate(feedId);
    assert.ok(update.price.conf > 0n, "expected a non-zero confidence interval");
    const now = Math.floor(Date.now() / 1000);

    const market = await bootstrapMarketContext(
      {
        slug: `btc-conf-${`${Date.now()}`.slice(-8)}`,
        assetSymbol: "BTC",
        oracleFeedId: feedIdHexToBytes(feedId),
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
          oracleMaxDelaySeconds: 300,
          oracleMaxConfidenceBps: 0,
        },
        epochTiming: {
          openAt: 0,
          lockAt: now + 2,
          resolveAt: now + 4,
        },
      }
    );

    await sleep(4_000);

    await expectFailure(
      postPriceUpdateAndConsume({
        provider: market.provider,
        update,
        makeConsumerInstruction: (priceUpdate) => lockEpochIx(market, priceUpdate),
      }),
      "Oracle confidence too wide"
    );
  });
});
