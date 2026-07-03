# Base Sepolia fallback rehearsal log (RC-2.2)

Re-run and append output:

```bash
./scripts/smoke-production.sh http://127.0.0.1:8080
```

## Template

| Field | Value |
|-------|-------|
| Date | 2026-07-03 |
| Operator | _(fill on rehearsal)_ |
| V3 flags | `GOODDOLLAR_ENABLED=0`, `VITE_GOODDOLLAR_ENABLED=0` (required) |

### Steps

1. `docker compose up -d --build`
2. `curl` health + markets (see `smoke-production.sh`)
3. `pnpm dev:fe-v1` → markets + faucet deposit on Base Sepolia
4. Attach screenshot path or deposit tx hash

### Status

`PENDING_OPERATOR_REHEARSAL` — append `smoke-production.sh` output when local stack is running.
