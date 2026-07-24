/**
 * RetroPick MarketEngine — TypeScript types
 *
 * Mirrors the Solidity storage model in MarketEngineState.sol.
 * These types are shared by contract hooks, context, and UI components.
 */

// ── Enums ────────────────────────────────────────────────────────────────────

/** EpochState as stored on-chain (uint8). */
export enum EpochState {
  Uninitialized = 0,
  Open          = 1,
  Locked        = 2,
  Resolved      = 3,
  Cancelled     = 4,
}

/** MarketType — determines resolution logic (uint8). */
export enum MarketType {
  Direction  = 0, // price UP or DOWN between checkpoint A and B
  Threshold  = 1, // price ABOVE or BELOW a fixed level at close
  RangeClose = 2, // price lands within a defined range bin
}

/** OracleType — which resolver path the template uses (uint8). */
export enum OracleType {
  ChainlinkPriceFeed = 0,
  TrustedReporter    = 1,
}

/** RollingPhase — lifecycle state of rolling (auto-advancing) markets (uint8). */
export enum RollingPhase {
  Uninitialized = 0,
  GenesisOpen   = 1,
  GenesisClosed = 2,
  Live          = 3,
  Halted        = 4,
}

// ── Vault & pool data ────────────────────────────────────────────────────────

/** Logical vault buckets for a single template (read from getVaultBalances). */
export interface VaultBalances {
  active: bigint; // funds in open/locked epochs
  claims: bigint; // winner claims pending withdrawal
  fees:   bigint; // protocol fee reserve
}

// ── Epoch ────────────────────────────────────────────────────────────────────

/**
 * On-chain Epoch struct (read from getEpoch).
 * All amounts are in stakeToken smallest units (USDC = 6 decimals on Arbitrum).
 */
export interface Epoch {
  state:          EpochState;
  totalPool:      bigint;
  winningOutcome: number;   // uint8; only valid after Resolved
  openAt:         bigint;   // unix seconds
  lockAt:         bigint;
  resolveAt:      bigint;
  outcomePools:   bigint[]; // index = outcomeIndex
}

/** Display-friendly epoch (amounts formatted as strings). */
export interface EpochDisplay {
  templateId: `0x${string}`;
  epochId:    number;
  state:      EpochState;
  stateLabel: string;
  totalPool:  string;        // e.g. "1,234.56"
  winningOutcome: number;
  openAt:    Date;
  lockAt:    Date;
  resolveAt: Date;
  outcomePools: string[];    // formatted
  timeRemaining: string;     // human-readable countdown
}

// ── Rolling lifecycle ─────────────────────────────────────────────────────────

export interface RollingLifecycle {
  phase:          RollingPhase;
  currentEpochId: bigint;
  nextEpochId:    bigint;
  lastTickAt:     bigint; // unix seconds
}

// ── User position ─────────────────────────────────────────────────────────────

/** A user's stake in a single (templateId, epochId, outcomeIndex). */
export interface UserPosition {
  templateId:   `0x${string}`;
  epochId:      number;
  outcomeIndex: number;
  amount:       bigint;          // raw stake token amount
  amountDisplay: string;         // formatted e.g. "12.50"
  epoch:        Epoch | null;
  claimable:    boolean;
  claimAmount:  bigint;
}

// ── Contract interaction params ───────────────────────────────────────────────

export interface DepositParams {
  templateId:   `0x${string}`;
  epochId:      bigint;
  outcomeIndex: number;
  amount:       bigint; // raw stakeToken amount (USDC 6-decimal)
}

export interface SwitchSideParams {
  templateId:      `0x${string}`;
  epochId:         bigint;
  fromOutcomeIndex: number;
  toOutcomeIndex:  number;
  amount:          bigint;
}

export interface ClaimParams {
  templateId: `0x${string}`;
  epochId:    bigint;
}

// ── Template metadata (off-chain companion to on-chain template) ──────────────

/**
 * Frontend-facing market template definition.
 * On-chain `templateId = keccak256(slug)`.
 */
export interface MarketTemplate {
  templateId:  `0x${string}`;
  slug:        string;
  title:       string;
  description: string;
  category:    MarketCategory;
  marketType:  MarketType;
  oracleType:  OracleType;
  outcomes:    TemplateOutcome[];
  feedSymbol?: string;  // e.g. "BTC/USD" for Chainlink path
  dataSource?: string;  // for TrustedReporter path
  /** Resolution formula shown in UI */
  resolutionFormula: string;
  /** Whether market is rolling (auto-advancing) */
  isRolling: boolean;
  /** Round duration in seconds */
  roundDuration: number;
}

export interface TemplateOutcome {
  index: number;
  label: string;     // e.g. "UP", "DOWN", "YES", "NO"
  color: string;     // tailwind color class
}

export type MarketCategory =
  | 'crypto'
  | 'economics'
  | 'financials'
  | 'business'
  | 'tech_science'
  | 'climate'
  | 'trending';
