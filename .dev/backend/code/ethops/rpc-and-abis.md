# Chain access (`ethops`): RPC failover, ABIs, caller vs client

This doc explains how `apps/backend/internal/ethops/*` provides chain access for both read-only and tx-related operations.

## Two different “clients”

### Failover RPC client (`failoverClient`)

Source: `apps/backend/internal/ethops/failover.go`

`ethops.NewFailoverRPCClient(primary, fallbacks)` returns a lazy-dialing RPC client that supports:

- `BlockNumber`, `HeaderByNumber`, `FilterLogs`\n- `CallContract`, `EstimateGas`\n- nonce, gas price, send tx, receipt

It implements a simple failover strategy:\n\n- maintains an ordered list of RPC URLs (primary first, then fallbacks)\n- keeps a cache of dialed `ethclient` instances\n- chooses an endpoint order where the “active” index is tried first\n- on retryable errors, invalidates the active client and tries the next endpoint\n- on success, promotes the successful endpoint to active

This is used by:\n\n- indexer (`FilterLogs`, `HeaderByNumber`, `BlockNumber`)\n- keeper executor (`EstimateGas`, `SendTransaction`, `TransactionReceipt`)\n- funding destination poller (`FilterLogs`, `BlockNumber`)

### Read-only ABI caller (`Caller`)

Source: `apps/backend/internal/ethops/caller.go`

`ethops.NewCaller(rpcURL, fallbacks...)`:\n\n- parses embedded ABIs:\n  - `IMarketEngine`\n  - `MarketEngineDispatcher`\n- performs `eth_call` through an internal failover client\n- unpacks results into typed structs and then normalizes them into JSON-ready maps

It is used by:\n\n- API endpoints that support “live” reads (`?source=live` paths)\n- keeper preflight (read epoch/template views)\n- health readiness check (block number)\n
## ABI embedding and hash

ABIs live under:

- `apps/backend/internal/abis/*`\n- `apps/backend/internal/abiembed/*` (dispatcher ABI used by indexer)

The API exposes an ABI hash in `/api/v1/livez` and `/api/v1/health` via `api.ABIHash()`, which uses `ethops.EmbeddedABIHash()`.\n\nThis is an operational diagnostic to detect ABI/registry mismatches.

## Live read caching

`Caller` has a global cache for “operator global view”:\n\n- `Caller.SetGlobalCacheTTL(ttl)` sets a TTL\n- `GetOperatorGlobalView` returns cached data when valid\n\nThis is a micro-optimization to reduce repeated live calls when operator UIs poll frequently.

## Prepared transactions

`Caller.PrepareTx(...)` packs calldata for whitelisted proxy writes.\n\nIt rejects non-zero ETH value and only returns calldata (the user wallet or keeper submits the transaction).

## Failure modes

- If no URLs are configured, failover returns `RPC_URL not configured`.\n- Some errors are treated as retryable (network timeouts, temporary transport failures).\n- Non-retryable errors propagate (e.g. deterministic JSON-RPC errors).

## Source pointers

- `apps/backend/internal/ethops/failover.go`\n- `apps/backend/internal/ethops/caller.go`\n- `apps/backend/internal/ethops/views.go`\n- `apps/backend/internal/abis/*`\n- `apps/backend/internal/abiembed/*`

