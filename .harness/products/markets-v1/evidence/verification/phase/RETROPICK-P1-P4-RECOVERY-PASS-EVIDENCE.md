# RetroPick P1-P4 Recovery Pass Evidence

Date: 2026-08-11

Scope:
- REC-1 partial: Gamma resilient cache no longer returns expired entries after upstream failure; Market detail keeps REST order-book polling active until a browser realtime subscriber exists.
- REC-2 partial: SIWE domain allowlist fails closed; wallet linking rejects unverified proxy/deposit wallet bindings.
- REC-3 partial: order preview amount semantics corrected for CLOB limit orders where size is outcome shares; BUY collateral is derived into makerAmount and displayed from signed base units.

Verification:
- `go test ./internal/markets/... -count=1` from `apps/backend` — pass.
- `pnpm test:markets` from `apps/web` — pass, 29 files / 87 tests.
- `pnpm typecheck` from `apps/web` — pass.
- `git diff --check` — pass.

Residual risk:
- REC-4 durable Postgres order journal / atomic idempotency remains unimplemented.
- Full official Polymarket CLOB differential fixture gate remains unimplemented.
- Live venue submit, relayer, CTF, redemption, and withdrawal mutations remain out of scope/off.
