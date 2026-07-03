# Base Sepolia fallback rehearsal log (RC-2.2)

Re-run and append output:

```bash
./scripts/smoke-production.sh http://127.0.0.1:8080
```

## Template

| Field | Value |
|-------|-------|
| Date | 2026-07-03 |
| Operator | Cursor QA agent |
| V3 flags | `GOODDOLLAR_ENABLED=0`, `VITE_GOODDOLLAR_ENABLED=0` (required) |
| Branch | `release/demo-rc-v3` @ `ee0261e0d` (+ QA P0 default-export fix) |

### Steps

1. Stack: postgres (internal network alias `postgres`) + migrator + `docker compose up --no-deps api indexer`
2. `curl` health + markets via `smoke-production.sh`
3. `pnpm dev:fe-v1` → Next.js ready on `:3000` (first route compile on demand)
4. `pnpm build` (fe-v1) — production build green after default-export fix

### Smoke output (2026-07-03)

```
websocket endpoint: ws://127.0.0.1:8080/ws
smoke checks passed for http://127.0.0.1:8080
```

Health snapshot:

- `chainId`: 84532 (Base Sepolia)
- `marketEngineProxy`: `0x1ed89defc8fbcbd512c562b148868ffdc778018a`
- Indexer caught up to block `40650938` during smoke window
- `GET /api/v1/gooddollar/status` → HTTP 404 `feature_disabled` (flags off, expected)
- `GET /api/v1/markets` → `{"markets":[]}` (fresh DB; UI loads against API)

### Status

`REHEARSED` — API smoke green; production frontend build green; wallet deposit tx not recorded in this automated pass (operator may attach tx hash at demo time).
