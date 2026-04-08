import { strict as assert } from "node:assert";

import {
  bootstrapSingleSideContext,
  decodePosition,
  depositToSideIx,
  expectFailure,
  sendIx,
  switchSideIx,
  tokenAmount,
  upsertTemplateIx,
} from "./helpers/marketEngine";

describe("single-side mode", function () {
  this.timeout(30_000);

  it("allows same-side top-up and full-position flip", async () => {
    const ctx = await bootstrapSingleSideContext("btc-5m-dir-single-a");

    await sendIx(ctx.provider, [depositToSideIx(ctx, 0, 100_000_000n)], [ctx.user]);
    await sendIx(ctx.provider, [depositToSideIx(ctx, 0, 50_000_000n)], [ctx.user]);
    await sendIx(ctx.provider, [switchSideIx(ctx, 0, 1, 150_000_000n)], [ctx.user]);

    const position = await decodePosition(ctx.provider.connection, ctx.position);
    assert.equal(position.stakes[0], 0n);
    assert.equal(position.stakes[1], 147_000_000n);
    assert.equal(position.totalStake, 147_000_000n);
    assert.equal(position.switchFeesPaid, 3_000_000n);

    const feeVaultAmount = await tokenAmount(ctx.provider.connection, ctx.feeVault);
    assert.equal(feeVaultAmount, 3_000_000n);
  });

  it("rejects opposite-side deposit while a side is already active", async () => {
    const ctx = await bootstrapSingleSideContext("btc-5m-dir-single-b");

    await sendIx(ctx.provider, [depositToSideIx(ctx, 0, 100_000_000n)], [ctx.user]);
    await expectFailure(
      sendIx(ctx.provider, [depositToSideIx(ctx, 1, 10_000_000n)], [ctx.user]),
      "Single-side positions only"
    );
  });

  it("rejects partial switch in single-side mode", async () => {
    const ctx = await bootstrapSingleSideContext("btc-5m-dir-single-c");

    await sendIx(ctx.provider, [depositToSideIx(ctx, 0, 100_000_000n)], [ctx.user]);
    await expectFailure(
      sendIx(ctx.provider, [switchSideIx(ctx, 0, 1, 40_000_000n)], [ctx.user]),
      "Partial switch not allowed in single-side mode"
    );
  });

  it("still allows switching after template deactivation for an already-open epoch", async () => {
    const ctx = await bootstrapSingleSideContext("btc-5m-dir-single-d");

    await sendIx(ctx.provider, [depositToSideIx(ctx, 0, 100_000_000n)], [ctx.user]);
    await sendIx(ctx.provider, [
      upsertTemplateIx({
        payer: ctx.admin.publicKey,
        admin: ctx.admin.publicKey,
        slug: "btc-5m-dir-single-d",
        assetSymbol: "BTC",
        active: false,
        allowMultiSidePositions: false,
      }),
    ]);

    await sendIx(ctx.provider, [switchSideIx(ctx, 0, 1, 100_000_000n)], [ctx.user]);

    const position = await decodePosition(ctx.provider.connection, ctx.position);
    assert.equal(position.stakes[0], 0n);
    assert.equal(position.stakes[1], 98_000_000n);
  });
});
