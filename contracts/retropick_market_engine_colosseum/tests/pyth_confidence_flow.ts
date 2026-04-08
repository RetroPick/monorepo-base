import { strict as assert } from "node:assert";

import * as marketEngine from "./helpers/marketEngine.ts";
import * as pyth from "./helpers/pyth.ts";

const { bootstrapMarketContext, expectFailure, lockEpochIx } = marketEngine;
const {
  DEFAULT_BTC_USD_FEED_ID,
  feedIdHexToBytes,
  fetchPriceUpdateAtTimestamp,
  postPriceUpdateAndConsume,
} = pyth;

describe("pyth confidence flow", function () {
  this.timeout(120_000);

  it("rejects a posted PriceUpdateV2 when confidence exceeds the configured tolerance", async () => {
    const feedId = process.env.PYTH_TEST_FEED_ID ?? DEFAULT_BTC_USD_FEED_ID;
    const update = await fetchPriceUpdateAtTimestamp(feedId, Math.floor(Date.now() / 1000) - 1800);
    assert.ok(update.price.conf > 0n, "expected a non-zero confidence interval");

    const market = await bootstrapMarketContext(
      {
        slug: `btc-conf-${`${Date.now()}`.slice(-8)}`,
        assetSymbol: "BTC",
        oracleFeedId: feedIdHexToBytes(feedId),
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
          oracleMaxConfidenceBps: 0,
        },
        epochTiming: {
          openAt: 0,
          lockAt: update.price.publishTime,
          resolveAt: update.price.publishTime + 1,
        },
      }
    );

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
