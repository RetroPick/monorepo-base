import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { strict as assert } from "node:assert";

import * as anchor from "@coral-xyz/anchor";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";

function loadProgramId(): PublicKey {
  const override = process.env.MARKET_ENGINE_PROGRAM_ID;
  if (override) {
    return new PublicKey(override);
  }

  const keypairPath = path.resolve(process.cwd(), "target/deploy/market_engine-keypair.json");
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
  return Keypair.fromSecretKey(secret).publicKey;
}

export const PROGRAM_ID = loadProgramId();
export const MAX_OUTCOMES = 8;

export type TestContext = {
  base: BaseContext;
  provider: anchor.AnchorProvider;
  admin: Keypair;
  user: Keypair;
  mint: PublicKey;
  userTokenAccount: PublicKey;
  config: PublicKey;
  template: PublicKey;
  ledger: PublicKey;
  epoch: PublicKey;
  position: PublicKey;
  activeVault: PublicKey;
  feeVault: PublicKey;
  claimsVault: PublicKey;
  activeVaultMeta: PublicKey;
  feeVaultMeta: PublicKey;
  claimsVaultMeta: PublicKey;
  activeVaultAuthority: PublicKey;
  feeVaultAuthority: PublicKey;
  claimsVaultAuthority: PublicKey;
  treasuryTokenAccount: PublicKey;
};

export type MarketContext = Omit<
  TestContext,
  "user" | "userTokenAccount" | "position"
> & {
  primaryUser: Keypair;
  primaryUserTokenAccount: PublicKey;
  primaryPosition: PublicKey;
};

export type BootstrapConfig = {
  defaultSettlementFeeBps?: number;
  maxSwitchFeeBps?: number;
  maxOutcomes?: number;
  oracleMaxDelaySeconds?: number;
  oracleMaxConfidenceBps?: number;
};

export type TemplateConfig = {
  slug: string;
  assetSymbol: string;
  oracleFeedId?: Buffer | Uint8Array;
  marketType?: number;
  condition?: number;
  thresholdRule?: number;
  active?: boolean;
  outcomeCount?: number;
  absoluteThresholdValueE8?: bigint | number;
  rangeBoundsE8?: (bigint | number)[];
  switchFeeBps?: number;
  settlementFeeBps?: number;
  allowMultiSidePositions: boolean;
};

export type BaseContext = {
  provider: anchor.AnchorProvider;
  admin: Keypair;
  mint: PublicKey;
  config: PublicKey;
  treasuryTokenAccount: PublicKey;
};

export function providerFromEnv(): anchor.AnchorProvider {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  return provider;
}

export async function airdrop(connection: Connection, recipient: PublicKey, lamports = 2_000_000_000): Promise<void> {
  const latest = await connection.getLatestBlockhash("confirmed");
  const sig = await connection.requestAirdrop(recipient, lamports);
  await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
}

export function u64(value: bigint | number): Buffer {
  const bn = BigInt(value);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(bn);
  return buffer;
}

export function i64(value: bigint | number): Buffer {
  const bn = BigInt.asIntN(64, BigInt(value));
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(bn);
  return buffer;
}

export function u16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

export function bool(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0]);
}

export function string(value: string): Buffer {
  const raw = Buffer.from(value, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(raw.length, 0);
  return Buffer.concat([len, raw]);
}

export function i128(value: bigint | number): Buffer {
  let x = BigInt.asUintN(128, BigInt(value));
  const out = Buffer.alloc(16);
  for (let i = 0; i < 16; i += 1) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

export function discriminator(name: string): Buffer {
  return crypto.createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

export function pda(seeds: (Buffer | Uint8Array)[]): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
}

export async function sendIx(provider: anchor.AnchorProvider, instructions: TransactionInstruction[], signers: Keypair[] = []): Promise<void> {
  const tx = new Transaction().add(...instructions);
  const latest = await provider.connection.getLatestBlockhash("confirmed");
  tx.feePayer = provider.wallet.publicKey;
  tx.recentBlockhash = latest.blockhash;
  if (signers.length > 0) {
    tx.partialSign(...signers);
  }
  const signed = await provider.wallet.signTransaction(tx);
  const signature = await provider.connection.sendRawTransaction(signed.serialize(), {
    preflightCommitment: "confirmed",
    skipPreflight: false,
  });
  await provider.connection.confirmTransaction({ signature, ...latest }, "confirmed");
}

export async function sendLegacyTransactions(
  provider: anchor.AnchorProvider,
  transactions: { tx: Transaction; signers: anchor.web3.Signer[] }[]
): Promise<void> {
  for (const { tx, signers } of transactions) {
    const latest = await provider.connection.getLatestBlockhash("confirmed");
    tx.feePayer = provider.wallet.publicKey;
    tx.recentBlockhash = latest.blockhash;
    if (signers.length > 0) {
      tx.partialSign(...signers);
    }
    const signed = await provider.wallet.signTransaction(tx);
    const signature = await provider.connection.sendRawTransaction(signed.serialize(), {
      preflightCommitment: "confirmed",
      skipPreflight: false,
    });
    await provider.connection.confirmTransaction({ signature, ...latest }, "confirmed");
  }
}

export async function sendVersionedTransactions(
  provider: anchor.AnchorProvider,
  transactions: { tx: VersionedTransaction; signers: anchor.web3.Signer[] }[]
): Promise<void> {
  const wallet = provider.wallet as anchor.Wallet;
  for (const { tx, signers } of transactions) {
    tx.sign(signers);
    const signed = await wallet.signTransaction(tx);
    const signature = await provider.connection.sendTransaction(signed, {
      preflightCommitment: "confirmed",
      skipPreflight: false,
      maxRetries: 5,
    });
    const latest = await provider.connection.getLatestBlockhash("confirmed");
    await provider.connection.confirmTransaction({ signature, ...latest }, "confirmed");
  }
}

export async function expectFailure(promise: Promise<unknown>, expected: string): Promise<void> {
  try {
    await promise;
    assert.fail(`expected failure containing "${expected}"`);
  } catch (error) {
    const message = `${error}`;
    const logs = Array.isArray((error as { logs?: string[] }).logs)
      ? (error as { logs?: string[] }).logs!.join("\n")
      : "";
    assert.match(`${message}\n${logs}`, new RegExp(expected));
  }
}

export function configPda(): PublicKey {
  return pda([Buffer.from("config")]);
}

export async function decodeConfigStakeMint(connection: Connection, config: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(config, "confirmed");
  assert(info, "config account missing");
  const data = info.data.subarray(8);
  let offset = 0;
  offset += 1; // version
  offset += 1; // bump
  offset += 32; // admin
  offset += 32; // treasury
  offset += 32; // worker_authority
  offset += 1; // paused
  return new PublicKey(data.subarray(offset, offset + 32));
}

export function templatePda(slug: string): PublicKey {
  return pda([Buffer.from("template"), Buffer.from(slug)]);
}

export function ledgerPda(template: PublicKey): PublicKey {
  return pda([Buffer.from("ledger"), template.toBuffer()]);
}

export function epochPda(template: PublicKey, epochId: bigint): PublicKey {
  return pda([Buffer.from("epoch"), template.toBuffer(), u64(epochId)]);
}

export function positionPda(epoch: PublicKey, user: PublicKey): PublicKey {
  return pda([Buffer.from("position"), epoch.toBuffer(), user.toBuffer()]);
}

export function vaultMetaPda(seed: string, template: PublicKey): PublicKey {
  return pda([Buffer.from(seed), template.toBuffer()]);
}

export function vaultTokenPda(seed: string, template: PublicKey): PublicKey {
  return pda([Buffer.from(seed), template.toBuffer()]);
}

export function vaultAuthorityPda(seed: string, template: PublicKey): PublicKey {
  return pda([Buffer.from(seed), template.toBuffer()]);
}

export function initializeConfigIx(params: {
  payer: PublicKey;
  admin: PublicKey;
  treasury: PublicKey;
  workerAuthority: PublicKey;
  stakeMint: PublicKey;
  defaultSettlementFeeBps?: number;
  maxSwitchFeeBps?: number;
  maxOutcomes?: number;
  oracleKind?: number;
  oracleMaxDelaySeconds?: number;
  oracleMaxConfidenceBps?: number;
}): TransactionInstruction {
  const data = Buffer.concat([
    discriminator("initialize_config"),
    params.treasury.toBuffer(),
    params.workerAuthority.toBuffer(),
    params.stakeMint.toBuffer(),
    u16(params.defaultSettlementFeeBps ?? 500),
    u16(params.maxSwitchFeeBps ?? 300),
    Buffer.from([params.maxOutcomes ?? 2]),
    Buffer.from([params.oracleKind ?? 0]),
    i64(params.oracleMaxDelaySeconds ?? 300),
    u16(params.oracleMaxConfidenceBps ?? 10_000),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: params.admin, isSigner: true, isWritable: true },
      { pubkey: configPda(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function upsertTemplateIx(params: {
  payer: PublicKey;
  admin: PublicKey;
  slug: string;
  assetSymbol: string;
  active?: boolean;
  allowMultiSidePositions: boolean;
  templateAccount?: PublicKey;
  oracleFeedId?: Buffer | Uint8Array;
  marketType?: number;
  condition?: number;
  thresholdRule?: number;
  outcomeCount?: number;
  absoluteThresholdValueE8?: bigint | number;
  rangeBoundsE8?: (bigint | number)[];
  switchFeeBps?: number;
  settlementFeeBps?: number;
}): TransactionInstruction {
  const rangeBounds = Array.from(
    { length: MAX_OUTCOMES - 1 },
    (_, index) => params.rangeBoundsE8?.[index] ?? 0
  );
  const rangeBoundsBuffer = Buffer.concat(rangeBounds.map((value) => i128(value)));
  const oracleFeedId = params.oracleFeedId
    ? Buffer.from(params.oracleFeedId)
    : Buffer.alloc(32, 1);
  assert.equal(oracleFeedId.length, 32, "oracle feed id must be 32 bytes");
  const data = Buffer.concat([
    discriminator("upsert_template"),
    string(params.slug),
    string(params.assetSymbol),
    oracleFeedId,
    Buffer.from([params.marketType ?? 0]),
    Buffer.from([params.condition ?? 0]),
    Buffer.from([params.thresholdRule ?? 0]),
    bool(params.active ?? true),
    Buffer.from([params.outcomeCount ?? 2]),
    i128(params.absoluteThresholdValueE8 ?? 0),
    rangeBoundsBuffer,
    u16(params.switchFeeBps ?? 200),
    u16(params.settlementFeeBps ?? 500),
    bool(params.allowMultiSidePositions),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: params.admin, isSigner: true, isWritable: true },
      { pubkey: configPda(), isSigner: false, isWritable: false },
      { pubkey: params.templateAccount ?? templatePda(params.slug), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function initializeMarketIx(
  ctx: Pick<
    TestContext,
    | "admin"
    | "config"
    | "template"
    | "ledger"
    | "activeVaultMeta"
    | "activeVault"
    | "activeVaultAuthority"
    | "claimsVaultMeta"
    | "claimsVault"
    | "claimsVaultAuthority"
    | "feeVaultMeta"
    | "feeVault"
    | "feeVaultAuthority"
    | "mint"
  >
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVaultMeta, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.claimsVaultMeta, isSigner: false, isWritable: true },
      { pubkey: ctx.claimsVault, isSigner: false, isWritable: true },
      { pubkey: ctx.claimsVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.feeVaultMeta, isSigner: false, isWritable: true },
      { pubkey: ctx.feeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.feeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator("initialize_market"),
  });
}

export function openEpochIx(
  ctx: Pick<TestContext, "admin" | "config" | "template" | "ledger" | "epoch">,
  epochId: bigint,
  now: number
): TransactionInstruction {
  return openEpochWithTimingIx(ctx, epochId, {
    openAt: 0,
    lockAt: now + 3600,
    resolveAt: now + 7200,
  });
}

export function openEpochWithTimingIx(
  ctx: Pick<TestContext, "admin" | "config" | "template" | "ledger" | "epoch">,
  epochId: bigint,
  params: {
    openAt: number;
    lockAt: number;
    resolveAt: number;
  }
): TransactionInstruction {
  const data = Buffer.concat([
    discriminator("open_epoch"),
    u64(epochId),
    i64(params.openAt),
    i64(params.lockAt),
    i64(params.resolveAt),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: true },
      { pubkey: ctx.epoch, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function depositToSideIx(ctx: TestContext, outcomeIndex: number, amount: bigint): TransactionInstruction {
  const data = Buffer.concat([discriminator("deposit_to_side"), Buffer.from([outcomeIndex]), u64(amount)]);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.user.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: true },
      { pubkey: ctx.epoch, isSigner: false, isWritable: true },
      { pubkey: ctx.position, isSigner: false, isWritable: true },
      { pubkey: ctx.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function switchSideIx(ctx: TestContext, fromOutcome: number, toOutcome: number, grossAmount: bigint): TransactionInstruction {
  const data = Buffer.concat([
    discriminator("switch_side"),
    Buffer.from([fromOutcome]),
    Buffer.from([toOutcome]),
    u64(grossAmount),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.user.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: true },
      { pubkey: ctx.epoch, isSigner: false, isWritable: true },
      { pubkey: ctx.position, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.activeVaultMeta, isSigner: false, isWritable: false },
      { pubkey: ctx.feeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.feeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.feeVaultMeta, isSigner: false, isWritable: false },
      { pubkey: ctx.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function lockEpochIx(
  ctx: Pick<TestContext, "admin" | "config" | "template" | "ledger" | "epoch">,
  priceUpdate: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.admin.publicKey, isSigner: true, isWritable: false },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: false },
      { pubkey: ctx.epoch, isSigner: false, isWritable: true },
      { pubkey: priceUpdate, isSigner: false, isWritable: false },
    ],
    data: discriminator("lock_epoch"),
  });
}

export function resolveEpochIx(
  ctx: Pick<
    TestContext,
    | "admin"
    | "config"
    | "template"
    | "ledger"
    | "epoch"
    | "activeVault"
    | "activeVaultAuthority"
    | "activeVaultMeta"
    | "claimsVault"
    | "claimsVaultMeta"
    | "claimsVaultAuthority"
    | "feeVault"
    | "feeVaultMeta"
    | "feeVaultAuthority"
    | "mint"
  >,
  priceUpdate: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.admin.publicKey, isSigner: true, isWritable: false },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: true },
      { pubkey: ctx.epoch, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.activeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.activeVaultMeta, isSigner: false, isWritable: false },
      { pubkey: ctx.claimsVault, isSigner: false, isWritable: true },
      { pubkey: ctx.claimsVaultMeta, isSigner: false, isWritable: false },
      { pubkey: ctx.claimsVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.feeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.feeVaultMeta, isSigner: false, isWritable: false },
      { pubkey: ctx.feeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: priceUpdate, isSigner: false, isWritable: false },
    ],
    data: discriminator("resolve_epoch"),
  });
}

export function claimIx(ctx: TestContext): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.user.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: true },
      { pubkey: ctx.epoch, isSigner: false, isWritable: true },
      { pubkey: ctx.position, isSigner: false, isWritable: true },
      { pubkey: ctx.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: ctx.claimsVault, isSigner: false, isWritable: true },
      { pubkey: ctx.claimsVaultMeta, isSigner: false, isWritable: false },
      { pubkey: ctx.claimsVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: discriminator("claim"),
  });
}

export function withdrawFeesIx(
  ctx: Pick<
    TestContext,
    | "admin"
    | "config"
    | "template"
    | "ledger"
    | "feeVault"
    | "feeVaultMeta"
    | "feeVaultAuthority"
    | "treasuryTokenAccount"
    | "mint"
  >,
  amount: bigint
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: ctx.admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: ctx.config, isSigner: false, isWritable: false },
      { pubkey: ctx.template, isSigner: false, isWritable: false },
      { pubkey: ctx.ledger, isSigner: false, isWritable: true },
      { pubkey: ctx.feeVault, isSigner: false, isWritable: true },
      { pubkey: ctx.feeVaultMeta, isSigner: false, isWritable: false },
      { pubkey: ctx.feeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: ctx.treasuryTokenAccount, isSigner: false, isWritable: true },
      { pubkey: ctx.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("withdraw_fees"), u64(amount)]),
  });
}

let cachedBaseContext: Promise<BaseContext> | undefined;

export async function bootstrapBaseContext(configParams: BootstrapConfig = {}): Promise<BaseContext> {
  if (cachedBaseContext) {
    const cached = await cachedBaseContext;
    const existingMint = await cached.provider.connection.getAccountInfo(cached.mint, "confirmed");
    const existingConfig = await cached.provider.connection.getAccountInfo(cached.config, "confirmed");
    if (existingMint && existingConfig) {
      return cached;
    }
    cachedBaseContext = undefined;
  }

  cachedBaseContext = (async () => {
    const provider = providerFromEnv();
    const admin = (provider.wallet as anchor.Wallet).payer;
    const config = configPda();
    const configInfo = await provider.connection.getAccountInfo(config, "confirmed");
    const mint = configInfo
      ? await decodeConfigStakeMint(provider.connection, config)
      : await createMint(provider.connection, admin, admin.publicKey, null, 6);
    const treasuryTokenAccount = (
      await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, admin.publicKey)
    ).address;
    if (!configInfo) {
      await sendIx(provider, [
        initializeConfigIx({
          payer: admin.publicKey,
          admin: admin.publicKey,
          treasury: admin.publicKey,
          workerAuthority: admin.publicKey,
          stakeMint: mint,
          defaultSettlementFeeBps: configParams.defaultSettlementFeeBps,
          maxSwitchFeeBps: configParams.maxSwitchFeeBps,
          maxOutcomes: configParams.maxOutcomes,
          oracleMaxDelaySeconds: configParams.oracleMaxDelaySeconds,
          oracleMaxConfidenceBps: configParams.oracleMaxConfidenceBps,
        }),
      ]);
    }

    return {
      provider,
      admin,
      mint,
      config,
      treasuryTokenAccount,
    };
  })();

  return cachedBaseContext;
}

export async function createUserContext(
  market: MarketContext,
  mintedAmount = 1_000_000_000n
): Promise<TestContext> {
  const { provider, admin, mint } = market;
  const user = Keypair.generate();
  await airdrop(provider.connection, user.publicKey);
  const userTokenAccount = (
    await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, user.publicKey)
  ).address;
  await mintTo(provider.connection, admin, mint, userTokenAccount, admin, mintedAmount);

  return {
    ...market,
    user,
    userTokenAccount,
    position: positionPda(market.epoch, user.publicKey),
  };
}

export async function bootstrapMarketContext(
  templateConfig: TemplateConfig,
  options: {
    bootstrap?: BootstrapConfig;
    epochId?: bigint;
    epochTiming?: {
      openAt: number;
      lockAt: number;
      resolveAt: number;
    };
  } = {}
): Promise<MarketContext> {
  const base = await bootstrapBaseContext(options.bootstrap);
  const { provider, admin, mint, config, treasuryTokenAccount } = base;
  const template = templatePda(templateConfig.slug);
  const ledger = ledgerPda(template);
  const epochId = options.epochId ?? 1n;
  const epoch = epochPda(template, epochId);
  const activeVaultMeta = vaultMetaPda("active_vault_meta", template);
  const claimsVaultMeta = vaultMetaPda("claims_vault_meta", template);
  const feeVaultMeta = vaultMetaPda("fee_vault_meta", template);
  const activeVault = vaultTokenPda("active_vault_token", template);
  const claimsVault = vaultTokenPda("claims_vault_token", template);
  const feeVault = vaultTokenPda("fee_vault_token", template);
  const activeVaultAuthority = vaultAuthorityPda("active_vault", template);
  const claimsVaultAuthority = vaultAuthorityPda("claims_vault", template);
  const feeVaultAuthority = vaultAuthorityPda("fee_vault", template);

  const primaryUser = Keypair.generate();
  await airdrop(provider.connection, primaryUser.publicKey);
  const primaryUserTokenAccount = (
    await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, primaryUser.publicKey)
  ).address;
  await mintTo(provider.connection, admin, mint, primaryUserTokenAccount, admin, 1_000_000_000n);

  const ctx: MarketContext = {
    base,
    provider,
    admin,
    primaryUser,
    primaryUserTokenAccount,
    primaryPosition: positionPda(epoch, primaryUser.publicKey),
    mint,
    config,
    template,
    ledger,
    epoch,
    activeVault,
    feeVault,
    claimsVault,
    activeVaultMeta,
    feeVaultMeta,
    claimsVaultMeta,
    activeVaultAuthority,
    feeVaultAuthority,
    claimsVaultAuthority,
    treasuryTokenAccount,
  };

  await sendIx(provider, [
    upsertTemplateIx({
      payer: admin.publicKey,
      admin: admin.publicKey,
      slug: templateConfig.slug,
      assetSymbol: templateConfig.assetSymbol,
      active: templateConfig.active,
      allowMultiSidePositions: templateConfig.allowMultiSidePositions,
      oracleFeedId: templateConfig.oracleFeedId,
      marketType: templateConfig.marketType,
      condition: templateConfig.condition,
      thresholdRule: templateConfig.thresholdRule,
      outcomeCount: templateConfig.outcomeCount,
      absoluteThresholdValueE8: templateConfig.absoluteThresholdValueE8,
      rangeBoundsE8: templateConfig.rangeBoundsE8,
      switchFeeBps: templateConfig.switchFeeBps,
      settlementFeeBps: templateConfig.settlementFeeBps,
    }),
  ]);
  await sendIx(provider, [initializeMarketIx(ctx)]);
  const now = Math.floor(Date.now() / 1000);
  const timing = options.epochTiming ?? {
    openAt: 0,
    lockAt: now + 3600,
    resolveAt: now + 7200,
  };
  await sendIx(provider, [openEpochWithTimingIx(ctx, epochId, timing)]);

  return ctx;
}

export async function bootstrapSingleSideContext(slug = "btc-5m-dir-single"): Promise<TestContext> {
  const market = await bootstrapMarketContext({
    slug,
    assetSymbol: "BTC",
    allowMultiSidePositions: false,
  });
  return {
    ...market,
    user: market.primaryUser,
    userTokenAccount: market.primaryUserTokenAccount,
    position: market.primaryPosition,
  };
}

export async function tokenAmount(connection: Connection, account: PublicKey): Promise<bigint> {
  return (await getAccount(connection, account)).amount;
}

export async function decodePosition(connection: Connection, position: PublicKey): Promise<{
  stakes: bigint[];
  totalStake: bigint;
  switchFeesPaid: bigint;
  claimedAmount: bigint;
  claimed: boolean;
}> {
  const info = await connection.getAccountInfo(position, "confirmed");
  assert(info, "position account missing");
  const data = info.data.subarray(8);
  let offset = 0;
  offset += 1; // version
  offset += 1; // bump
  const stakes: bigint[] = [];
  for (let i = 0; i < MAX_OUTCOMES; i += 1) {
    stakes.push(data.readBigUInt64LE(offset));
    offset += 8;
  }
  const totalStake = data.readBigUInt64LE(offset);
  offset += 8;
  const switchFeesPaid = data.readBigUInt64LE(offset);
  offset += 8;
  offset += 8; // entry_fees_paid
  const claimedAmount = data.readBigUInt64LE(offset);
  offset += 8;
  const claimed = data.readUInt8(offset) === 1;
  return { stakes, totalStake, switchFeesPaid, claimedAmount, claimed };
}

export async function decodeEpoch(connection: Connection, epoch: PublicKey): Promise<{
  status: number;
  winningOutcomeMask: bigint;
  claimLiabilityTotal: bigint;
  settlementFeeTotal: bigint;
  claimedTotal: bigint;
  remainingWinningStake: bigint;
  refundMode: boolean;
  claimable: boolean;
}> {
  const info = await connection.getAccountInfo(epoch, "confirmed");
  assert(info, "epoch account missing");
  const data = info.data.subarray(8);
  let offset = 0;
  offset += 1; // version
  offset += 1; // bump
  offset += 8; // epoch_id
  const status = data.readUInt8(offset);
  offset += 1;
  offset += 1; // cancel_reason
  offset += 24; // timing
  offset += 33; // checkpoint_a
  offset += 33; // checkpoint_b
  offset += 32; // oracle feed
  offset += 1; // market_type
  offset += 1; // condition
  offset += 16; // threshold
  offset += 16 * (MAX_OUTCOMES - 1); // range bounds
  offset += 2; // switch fee bps
  offset += 2; // settlement fee bps
  offset += 1; // equal_price_voids
  offset += 1; // fee_on_losing_pool
  offset += 1; // allow_multi_side_positions
  offset += 1; // outcome_count
  const winningOutcomeMask = data.readBigUInt64LE(offset);
  offset += 8;
  offset += 8; // total_pool
  offset += 8 * MAX_OUTCOMES; // outcome_pools
  offset += 8; // switch_fee_total
  const settlementFeeTotal = data.readBigUInt64LE(offset);
  offset += 8;
  const claimLiabilityTotal = data.readBigUInt64LE(offset);
  offset += 8;
  offset += 8; // total_refund_liability
  const claimedTotal = data.readBigUInt64LE(offset);
  offset += 8;
  const remainingWinningStake = data.readBigUInt64LE(offset);
  offset += 8;
  const refundMode = data.readUInt8(offset) === 1;
  offset += 1;
  const claimable = data.readUInt8(offset) === 1;
  return {
    status,
    winningOutcomeMask,
    claimLiabilityTotal,
    settlementFeeTotal,
    claimedTotal,
    remainingWinningStake,
    refundMode,
    claimable,
  };
}

export async function decodeLedger(connection: Connection, ledger: PublicKey): Promise<{
  activeCollateralTotal: bigint;
  claimsReserveTotal: bigint;
  feeReserveTotal: bigint;
}> {
  const info = await connection.getAccountInfo(ledger, "confirmed");
  assert(info, "ledger account missing");
  const data = info.data.subarray(8);
  let offset = 0;
  offset += 1; // version
  offset += 1; // bump
  offset += 8; // active_epoch_id
  offset += 8; // last_resolved_epoch_id
  const activeCollateralTotal = data.readBigUInt64LE(offset);
  offset += 8;
  const claimsReserveTotal = data.readBigUInt64LE(offset);
  offset += 8;
  const feeReserveTotal = data.readBigUInt64LE(offset);
  return {
    activeCollateralTotal,
    claimsReserveTotal,
    feeReserveTotal,
  };
}

export function userAta(mint: PublicKey, owner: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner);
}
