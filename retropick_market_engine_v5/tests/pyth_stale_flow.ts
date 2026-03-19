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

describe("pyth stale flow", function () {
  this.timeout(120_000);

  it("rejects a posted PriceUpdateV2 that is older than max_delay_seconds", async () => {
    const feedId = process.env.PYTH_TEST_FEED_ID ?? DEFAULT_BTC_USD_FEED_ID;
    const staleUpdate = await fetchPriceUpdateAtTimestamp(
      feedId,
      Math.floor(Date.now() / 1000) - 7200
    );

    const market = await bootstrapMarketContext(
      {
        slug: `btc-stale-${`${Date.now()}`.slice(-8)}`,
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
          oracleMaxDelaySeconds: 1,
          oracleMaxConfidenceBps: 10_000,
        },
        epochTiming: {
          openAt: 0,
          lockAt: staleUpdate.price.publishTime,
          resolveAt: staleUpdate.price.publishTime + 1,
        },
      }
    );

    await expectFailure(
      postPriceUpdateAndConsume({
        provider: market.provider,
        update: staleUpdate,
        makeConsumerInstruction: (priceUpdate) => lockEpochIx(market, priceUpdate),
      }),
      "Oracle stale"
    );

    assert.ok(staleUpdate.price.publishTime < Math.floor(Date.now() / 1000) - 1);
  });
});
