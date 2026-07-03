# Base Sepolia fallback demo

Use this path when Alfajores V3 E2E (RC-1.4) is not green. **Keep all V3 / GoodDollar flags off.**

## Cold start (&lt;30 minutes)

### 1. Stack

```bash
cd /path/to/retropick
docker compose up -d --build
# Docker Desktop hairpin: docker compose --env-file compose.desktop-hairpin.env up -d --build
```

### 2. Frontend

```bash
pnpm dev:fe-v1
# Open http://localhost:3000 (or configured port)
```

### 3. Fund test wallet

- Network: **Base Sepolia** (chain id `84532`)
- TokenFaucet: see `packages/contracts/registry.base-sepolia.json` → `tokenFaucet`
- Embedded registry: `apps/backend/internal/registrydata/registry.json`

### 4. Demo flow

1. Connect wallet on Base Sepolia.
2. Open a market → deposit mSTK via faucet-funded balance.
3. Confirm indexer projection (portfolio / positions update).
4. Optional: WebSocket market channel updates in devtools.

### 5. Verification

```bash
curl -sS http://127.0.0.1:8080/api/v1/health
curl -sS http://127.0.0.1:8080/api/v1/config/contracts | jq .marketEngineProxy
./scripts/smoke-production.sh http://127.0.0.1:8080
```

## Do not claim on this path

- GoodDollar / G$ on Alfajores
- Referral rewards or fee routing
- Daily market on-chain entry
- GoodID verification or EngagementRewards claims

## Rehearsal gate (RC-2.2)

Record evidence in [`demo-base-sepolia-rehearsal.log`](./demo-base-sepolia-rehearsal.log):

- `smoke-production.sh` exit 0
- Screenshot or log line showing market list + wallet deposit
- Confirm `GOODDOLLAR_ENABLED` and `VITE_GOODDOLLAR_ENABLED` are unset/off
