// MARKETS_CUSTODY: ADR-003 — no T4 (privateKey|seed|mnemonic) storage in Markets wallet code

/** Patterns that must not appear in runtime wallet code (except this definition file). */
export const FORBIDDEN_CUSTODY_PATTERNS = [
  /privateKey/i,
  /mnemonic/i,
  /seedPhrase/i,
  /localStorage\.setItem\([^)]*key/i,
  /sessionStorage\.setItem\([^)]*key/i,
] as const;

export const MARKETS_CUSTODY_INVARIANT = "MARKETS_CUSTODY: ADR-003 — no T4 storage";

export function assertNoCustodyViolation(source: string, fileLabel: string): void {
  for (const pattern of FORBIDDEN_CUSTODY_PATTERNS) {
    if (pattern.test(source)) {
      throw new Error(`${fileLabel} violates ${MARKETS_CUSTODY_INVARIANT}: ${pattern}`);
    }
  }
}
