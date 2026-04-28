/** Labels match `MarketTypes.sol` enum order (uint8 on-chain). */

export const MARKET_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Direction" },
  { value: 1, label: "Threshold" },
  { value: 2, label: "RangeClose" },
  { value: 3, label: "Velocity" },
  { value: 4, label: "Ladder" },
  { value: 5, label: "Convergence" },
  { value: 6, label: "Composite" },
  { value: 7, label: "Corridor" },
  { value: 8, label: "Cascade" },
];

export const ORACLE_CLASS_OPTIONS: { value: number; label: string; hint: string }[] = [
  { value: 0, label: "CHAINLINK_PRICE", hint: "Default price/volume feeds via ChainlinkAdapter" },
  { value: 1, label: "CHAINLINK_RATE", hint: "Rate / APR / BIRC / RVOL family via RateAdapter" },
  { value: 2, label: "CHAINLINK_SMARTDATA", hint: "NAV, PoR, SmartData via SmartDataAdapter" },
  { value: 3, label: "CHAINLINK_MACRO", hint: "US macro (BEA) via MacroAdapter" },
  { value: 4, label: "CHAINLINK_EQUITY", hint: "Tokenized equity via EquityAdapter" },
];

export const EXECUTION_MODE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Manual" },
  { value: 1, label: "Rolling" },
];

export const TEMPLATE_ORACLE_KIND_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Chainlink" },
  { value: 1, label: "TrustedReporter" },
];

export const CONDITION_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "AtOrAbove" },
  { value: 1, label: "Below" },
];

export const THRESHOLD_RULE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "None" },
  { value: 1, label: "Absolute" },
];

const ROLLING_FORBIDDEN_TYPES = new Set([5, 6, 7, 8]); // Convergence, Composite, Corridor, Cascade

const TRO_FORBIDDEN_TYPES = new Set([0, 3, 5, 6]); // Direction, Velocity, Convergence, Composite

export function validateTemplateConstraints(params: {
  executionMode: number;
  marketType: number;
  templateOracleKind: number;
}): { ok: boolean; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const { executionMode, marketType, templateOracleKind } = params;

  if (executionMode === 1 && ROLLING_FORBIDDEN_TYPES.has(marketType)) {
    blockers.push(
      "Rolling execution cannot be used with Convergence, Composite, Corridor, or Cascade (on-chain: manual-only for these types).",
    );
  }
  if (executionMode === 1 && templateOracleKind === 1) {
    blockers.push("TrustedReporter templates cannot use Rolling execution mode.");
  }
  if (templateOracleKind === 1 && TRO_FORBIDDEN_TYPES.has(marketType)) {
    blockers.push(
      "TrustedReporter cannot be combined with Direction, Velocity, Convergence, or Composite (use Chainlink at template level).",
    );
  }
  if (marketType === 7 || marketType === 8) {
    warnings.push("Corridor / Cascade on Chainlink path do not receive OHLC from feeds — TrustedReporter + OHLC is the intended path; review currentSmartContract §4.8–4.9 before going live.");
  }
  return { ok: blockers.length === 0, blockers, warnings };
}
