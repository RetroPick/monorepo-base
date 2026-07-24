/**
 * RetroPick MarketEngine TypeScript types
 *
 * Mirrors `MarketTypes` in contracts/legacy-pool-v1 (`EpochStatus`, `MarketType`, `RollingPhase`, etc.).
 */

// ── Enums (must match on-chain `MarketTypes.sol`) ─────────────────────────────

/** `MarketTypes.EpochStatus` */
export enum EpochState {
  Scheduled = 0,
  Open = 1,
  Locked = 2,
  Resolved = 3,
  Cancelled = 4,
  Voided = 5,
}

/** `MarketTypes.MarketType` */
export enum MarketType {
  Direction = 0,
  Threshold = 1,
  RangeClose = 2,
  Velocity = 3,
  Ladder = 4,
  Convergence = 5,
  Composite = 6,
  Corridor = 7,
  Cascade = 8,
}

/** `MarketTypes.OracleKind` */
export enum OracleType {
  Chainlink = 0,
  TrustedReporter = 1,
}

/** `MarketTypes.RollingPhase` */
export enum RollingPhase {
  Uninitialized = 0,
  GenesisOpen = 1,
  Live = 2,
  Halted = 3,
}

/** `MarketTypes.RollingHaltReason` */
export enum RollingHaltReason {
  NoneReason = 0,
  BufferMissOnLock = 1,
  BufferMissOnResolve = 2,
  OracleFailure = 3,
  OracleConfidenceWide = 4,
  ManualAdmin = 5,
}

// ── Vault & pool data ────────────────────────────────────────────────────────

export interface VaultBalances {
  active: bigint;
  claims: bigint;
  fees: bigint;
}

// ── Epoch (minimal view for UI; full struct comes from `getEpoch`) ───────────

/**
 * Fields read from `getEpoch` / `MarketTypes.Epoch` for display helpers.
 * The on-chain tuple is larger; wagmi returns the full object.
 */
export interface EpochForDisplay {
  status: number;
  timing: { openAt: bigint; lockAt: bigint; resolveAt: bigint };
  totalPool: bigint;
  outcomePools: readonly bigint[];
  winningOutcomeMask: bigint;
  outcomeCount: number;
}

/** @deprecated Use `EpochForDisplay`; kept for gradual migration. */
export type Epoch = EpochForDisplay;

/** Display-friendly epoch (amounts formatted as strings). */
export interface EpochDisplay {
  templateId: `0x${string}`;
  epochId: number;
  state: EpochState;
  stateLabel: string;
  totalPool: string;
  winningOutcome: number;
  openAt: Date;
  lockAt: Date;
  resolveAt: Date;
  outcomePools: string[];
  timeRemaining: string;
}

// ── Rolling lifecycle (`getRollingLifecycle` tuple) ───────────────────────────

export interface RollingLifecycle {
  phase: RollingPhase;
  haltReason: RollingHaltReason;
  haltedAtEpochId: bigint;
  rollingNextEpochId: bigint;
  activeEpochId: bigint;
  lastResolvedEpochId: bigint;
}

// ── User position ─────────────────────────────────────────────────────────────

export interface UserPosition {
  templateId: `0x${string}`;
  epochId: number;
  outcomeIndex: number;
  amount: bigint;
  amountDisplay: string;
  epoch: EpochForDisplay | null;
  claimable: boolean;
  claimAmount: bigint;
}

export interface DepositParams {
  templateId: `0x${string}`;
  epochId: bigint;
  outcomeIndex: number;
  amount: bigint;
}

export interface SwitchSideParams {
  templateId: `0x${string}`;
  epochId: bigint;
  fromOutcomeIndex: number;
  toOutcomeIndex: number;
  amount: bigint;
}

export interface ClaimParams {
  templateId: `0x${string}`;
  epochId: bigint;
}

export interface MarketTemplate {
  templateId: `0x${string}`;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  marketType: MarketType;
  oracleType: OracleType;
  outcomes: TemplateOutcome[];
  feedSymbol?: string;
  dataSource?: string;
  resolutionFormula: string;
  isRolling: boolean;
  roundDuration: number;
}

export interface TemplateOutcome {
  index: number;
  label: string;
  color: string;
}

export type MarketCategory =
  | "crypto"
  | "economics"
  | "financials"
  | "business"
  | "tech_science"
  | "climate"
  | "trending";
