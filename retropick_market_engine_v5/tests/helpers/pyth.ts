import { strict as assert } from "node:assert";
import path from "node:path";

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

import * as marketEngine from "./marketEngine.ts";

// Force the CJS entrypoints. The package ESM path currently breaks under Node 24 because
// one upstream dependency omits a `.js` extension in its export surface.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { HermesClient } = require(path.resolve(
  process.cwd(),
  "node_modules/@pythnetwork/hermes-client/dist/cjs/hermes-client.cjs"
));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  PythSolanaReceiver,
} = require(path.resolve(
  process.cwd(),
  "node_modules/@pythnetwork/pyth-solana-receiver/dist/cjs/PythSolanaReceiver.cjs"
));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  DEFAULT_RECEIVER_PROGRAM_ID,
  DEFAULT_WORMHOLE_PROGRAM_ID,
} = require(path.resolve(
  process.cwd(),
  "node_modules/@pythnetwork/pyth-solana-receiver/dist/cjs/address.cjs"
));

export const DEFAULT_HERMES_ENDPOINT = "https://hermes.pyth.network";
export const DEFAULT_BTC_USD_FEED_ID =
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

export type ParsedPythPrice = {
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: number;
};

export type HermesPriceUpdate = {
  feedId: string;
  binaryData: string[];
  price: ParsedPythPrice;
};

export type DirectionScenario = {
  start: HermesPriceUpdate;
  end: HermesPriceUpdate;
  winningOutcome: number;
};

function hermesClient(): any {
  return new HermesClient(process.env.HERMES_ENDPOINT ?? DEFAULT_HERMES_ENDPOINT, {
    timeout: 20_000,
    httpRetries: 2,
  });
}

function normalizeFeedId(feedId: string): string {
  return feedId.startsWith("0x") ? feedId.toLowerCase() : `0x${feedId.toLowerCase()}`;
}

export function feedIdHexToBytes(feedId: string): Buffer {
  const normalized = normalizeFeedId(feedId);
  const raw = Buffer.from(normalized.slice(2), "hex");
  assert.equal(raw.length, 32, "feed id must decode to 32 bytes");
  return raw;
}

function parseHermesPrice(parsed: {
  price: { price: string; conf: string; expo: number; publish_time: number };
}): ParsedPythPrice {
  return {
    price: BigInt(parsed.price.price),
    conf: BigInt(parsed.price.conf),
    expo: parsed.price.expo,
    publishTime: parsed.price.publish_time,
  };
}

async function fetchPriceUpdateInternal(
  loader: () => Promise<any>,
  feedId: string
): Promise<HermesPriceUpdate> {
  const normalized = normalizeFeedId(feedId);
  const update = await loader();
  assert(update.binary.data.length > 0, "Hermes returned no binary updates");
  const parsed = update.parsed?.find((entry) => normalizeFeedId(entry.id) === normalized);
  assert(parsed, `Hermes returned no parsed update for ${normalized}`);
  return {
    feedId: normalized,
    binaryData: update.binary.data,
    price: parseHermesPrice(parsed),
  };
}

export async function fetchLatestPriceUpdate(feedId: string): Promise<HermesPriceUpdate> {
  const client = hermesClient();
  return fetchPriceUpdateInternal(
    () =>
      client.getLatestPriceUpdates([normalizeFeedId(feedId)], {
        encoding: "base64",
        parsed: true,
      }),
    feedId
  );
}

export async function fetchPriceUpdateAtTimestamp(
  feedId: string,
  publishTime: number
): Promise<HermesPriceUpdate> {
  const client = hermesClient();
  return fetchPriceUpdateInternal(
    () =>
      client.getPriceUpdatesAtTimestamp(publishTime, [normalizeFeedId(feedId)], {
        encoding: "base64",
        parsed: true,
      }),
    feedId
  );
}

export async function findHistoricalDirectionScenario(
  feedId = DEFAULT_BTC_USD_FEED_ID
): Promise<DirectionScenario> {
  const now = Math.floor(Date.now() / 1000);
  const candidateOffsets = [
    [1800, 900],
    [3600, 1800],
    [7200, 3600],
    [10_800, 5400],
  ];

  for (const [startOffset, endOffset] of candidateOffsets) {
    const start = await fetchPriceUpdateAtTimestamp(feedId, now - startOffset);
    const end = await fetchPriceUpdateAtTimestamp(feedId, now - endOffset);
    if (
      start.price.publishTime < end.price.publishTime &&
      start.price.price !== end.price.price
    ) {
      return {
        start,
        end,
        winningOutcome: end.price.price > start.price.price ? 0 : 1,
      };
    }
  }

  throw new Error("unable to find a historical Pyth direction scenario with a non-flat move");
}

export async function postPriceUpdateAndConsume(params: {
  provider: anchor.AnchorProvider;
  update: HermesPriceUpdate;
  makeConsumerInstruction: (priceUpdate: PublicKey) => TransactionInstruction;
}): Promise<void> {
  const receiver = new PythSolanaReceiver({
    connection: params.provider.connection,
    wallet: params.provider.wallet as any,
    receiverProgramId: DEFAULT_RECEIVER_PROGRAM_ID,
    wormholeProgramId: DEFAULT_WORMHOLE_PROGRAM_ID,
    treasuryId: Number(process.env.PYTH_TREASURY_ID ?? 0),
  });

  const builder = receiver.newTransactionBuilder({ closeUpdateAccounts: true });
  await builder.addPostPriceUpdates(params.update.binaryData);
  await builder.addPriceConsumerInstructions(async (getPriceUpdateAccount) => [
    {
      instruction: params.makeConsumerInstruction(getPriceUpdateAccount(params.update.feedId)),
      signers: [],
      computeUnits: 300_000,
    },
  ]);

  const transactions = builder.buildLegacyTransactions({
    computeUnitPriceMicroLamports: 1,
    tightComputeBudget: true,
  });
  await sendLegacyTransactions(params.provider, transactions);
}
const { sendLegacyTransactions } = marketEngine;
