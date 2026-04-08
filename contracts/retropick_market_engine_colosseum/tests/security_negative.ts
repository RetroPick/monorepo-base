import { Keypair } from "@solana/web3.js";

import {
  airdrop,
  bootstrapMarketContext,
  closeEpochIx,
  closeEpochIxWithAuthority,
  createUserContext,
  depositToSideIxWithOverrides,
  expectFailure,
  sendIx,
  withdrawFeesIxWithAuthority,
} from "./helpers/marketEngine";
import { feedIdHexToBytes, fetchLatestPriceUpdate, getTestAssetSymbol, getTestFeedId } from "./helpers/pyth";

/** Template slug ≤ 32 bytes (on-chain `TEMPLATE_SLUG_MAX_LEN`); Pyth seeds must fit. */
function uniqueSlug(prefix: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const base = `${prefix}-${suffix}`;
  return base.length <= 32 ? base : base.slice(0, 32);
}

describe("security negative (account validation & roles)", function () {
  this.timeout(60_000);

  it("rejects deposit_to_side with a bogus SPL token program id", async () => {
    const feedId = getTestFeedId();
    const assetSymbol = getTestAssetSymbol();
    const latest = await fetchLatestPriceUpdate(feedId);
    const slug = uniqueSlug("sb");
    const market = await bootstrapMarketContext(
      {
        slug,
        assetSymbol,
        oracleFeedId: feedIdHexToBytes(latest.feedId),
        allowMultiSidePositions: true,
      },
      {}
    );
    const user = await createUserContext(market);
    const bogusTokenProgram = Keypair.generate().publicKey;
    await expectFailure(
      sendIx(user.provider, [depositToSideIxWithOverrides(user, 0, 1_000_000n, { tokenProgram: bogusTokenProgram })], [
        user.user,
      ]),
      "(InterfaceAccount|Token|Program)"
    );
  });

  it("rejects deposit_to_side when active_vault is another PDA (fee vault)", async () => {
    const feedId = getTestFeedId();
    const assetSymbol = getTestAssetSymbol();
    const latest = await fetchLatestPriceUpdate(feedId);
    const slug = uniqueSlug("sv");
    const market = await bootstrapMarketContext(
      {
        slug,
        assetSymbol,
        oracleFeedId: feedIdHexToBytes(latest.feedId),
        allowMultiSidePositions: true,
      },
      {}
    );
    const user = await createUserContext(market);
    await expectFailure(
      sendIx(user.provider, [depositToSideIxWithOverrides(user, 0, 1_000_000n, { activeVault: market.feeVault })], [
        user.user,
      ]),
      "seeds"
    );
  });

  it("rejects deposit_to_side when stake_mint does not match user ATA mint", async () => {
    const feedId = getTestFeedId();
    const assetSymbol = getTestAssetSymbol();
    const latest = await fetchLatestPriceUpdate(feedId);
    const slug = uniqueSlug("sm");
    const market = await bootstrapMarketContext(
      {
        slug,
        assetSymbol,
        oracleFeedId: feedIdHexToBytes(latest.feedId),
        allowMultiSidePositions: true,
      },
      {}
    );
    const user = await createUserContext(market);
    const wrongMint = Keypair.generate().publicKey;
    await expectFailure(
      sendIx(user.provider, [depositToSideIxWithOverrides(user, 0, 1_000_000n, { mint: wrongMint })], [user.user]),
      "stake_mint"
    );
  });

  it("rejects withdraw_fees when signer is neither admin nor treasury", async () => {
    const feedId = getTestFeedId();
    const assetSymbol = getTestAssetSymbol();
    const latest = await fetchLatestPriceUpdate(feedId);
    const slug = uniqueSlug("wf");
    const market = await bootstrapMarketContext(
      {
        slug,
        assetSymbol,
        oracleFeedId: feedIdHexToBytes(latest.feedId),
        allowMultiSidePositions: true,
      },
      {}
    );
    const attacker = Keypair.generate();
    await airdrop(market.provider.connection, attacker.publicKey);
    await expectFailure(
      sendIx(
        market.provider,
        [withdrawFeesIxWithAuthority(market, attacker.publicKey, 1n)],
        [attacker]
      ),
      "Unauthorized"
    );
  });

  it("rejects close_epoch while epoch has unsettled user stake", async () => {
    const feedId = getTestFeedId();
    const assetSymbol = getTestAssetSymbol();
    const latest = await fetchLatestPriceUpdate(feedId);
    const slug = uniqueSlug("cu");
    const market = await bootstrapMarketContext(
      {
        slug,
        assetSymbol,
        oracleFeedId: feedIdHexToBytes(latest.feedId),
        allowMultiSidePositions: true,
      },
      {}
    );
    const user = await createUserContext(market);
    await sendIx(user.provider, [depositToSideIxWithOverrides(user, 0, 1_000_000n)], [user.user]);
    await expectFailure(
      sendIx(market.provider, [closeEpochIx(market, market.admin.publicKey)], []),
      "Epoch not fully settled"
    );
  });

  it("rejects close_epoch when authority is not worker or admin", async () => {
    const feedId = getTestFeedId();
    const assetSymbol = getTestAssetSymbol();
    const latest = await fetchLatestPriceUpdate(feedId);
    const slug = uniqueSlug("ca");
    const market = await bootstrapMarketContext(
      {
        slug,
        assetSymbol,
        oracleFeedId: feedIdHexToBytes(latest.feedId),
        allowMultiSidePositions: true,
      },
      {
        epochTiming: {
          openAt: 0,
          lockAt: 1,
          resolveAt: 2,
        },
      }
    );
    const attacker = Keypair.generate();
    await airdrop(market.provider.connection, attacker.publicKey);
    await expectFailure(
      sendIx(
        market.provider,
        [closeEpochIxWithAuthority(market, attacker.publicKey, market.admin.publicKey)],
        [attacker]
      ),
      "Unauthorized"
    );
  });
});
