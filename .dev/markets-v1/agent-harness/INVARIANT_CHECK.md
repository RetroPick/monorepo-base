# Cross-document invariant check (master prompt §23)

**Date:** 2026-07-24  
**Method:** Manual review of PRD, ADRs, agent contract, and architecture docs.

## Invariants verified

- [x] Markets V1 creates Polymarket positions, not PRISM positions
- [x] Polymarket is the venue and settlement authority
- [x] RetroPick does not run a separate exchange or pool for Markets V1
- [x] No custom Markets contract is required by default
- [x] Android uses native Kotlin + Jetpack Compose
- [x] RetroPick does not hold raw user private keys
- [x] unsupported jurisdictions fail closed
- [x] no automatic or autonomous copy trading exists in V1

## Grep commands used

```bash
rg -l "PRISM position" .dev/markets-v1/ --glob '*.md' | head
rg "custom exchange" .dev/markets-v1/architecture/adr/
rg "copy trading" .dev/markets-v1/intelligence/
rg "fail closed" .dev/markets-v1/backend/
```

## Result

No contradictions found in baseline documentation. Re-run before PHASE-1 code merge.
