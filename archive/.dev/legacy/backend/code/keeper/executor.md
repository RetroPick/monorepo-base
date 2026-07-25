# Keeper hot-wallet executor

This doc explains `apps/backend/internal/keeper/executor.go`: how the keeper performs preflight checks and submits transactions from a hot wallet.

## Construction

`NewHotWalletExecutor(...)`:\n\n- parses a 32-byte private key hex\n- creates:\n  - an RPC failover client (`ethops.NewFailoverRPCClient`)\n  - a read-only caller (`ethops.NewCaller`)\n  - an ABI parser for `IMarketEngine`\n- stores:\n  - `from` address (derived from pubkey)\n  - proxy address\n  - chain id (for EIP-155 signer)\n  - receipt timeout + poll interval

## Preflight

Preflight is a safety gate to prevent obvious bad keeper transactions:

```mermaid
flowchart TD
  start[Preflight(action)] --> switch{action}
  switch -->|lockEpoch/resolveEpoch| epochView[caller.GetEpochView]
  epochView --> checkStatusTime[Check status and now vs lockAt/resolveAt]
  checkStatusTime -->|ok| ok1[Return view snapshot]
  checkStatusTime -->|bad| err1[Return snapshot + error]
  switch -->|genesisLockRolling/executeRollingRound| tplView[caller.GetOperatorTemplateView]
  tplView --> checkPhase[Check rollingPhase]
  checkPhase -->|ok| ok2[Return view snapshot]
  checkPhase -->|bad| err2[Return snapshot + error]
```

Important details:

- Preflight uses **live RPC** reads (`eth_call`) through `ethops.Caller`.\n- It checks on-chain time constraints using `time.Now().Unix()` against `lockAt`/`resolveAt` fields.\n- It checks `status` and `rollingPhase` numeric enums expected by the contract.

## Execute

Execute builds and submits a transaction:

1. Build ABI args:\n   - `lockEpoch(templateId, epochId)`\n   - `resolveEpoch(templateId, epochId)`\n   - `genesisLockRolling(templateId)`\n   - `executeRollingRound(templateId)`\n2. Pack calldata with `marketABI.Pack(string(action), args...)`.\n3. Estimate gas with `EstimateGas`.\n4. Fetch nonce (`PendingNonceAt`) and gas price (`SuggestGasPrice`).\n5. Build a **legacy** transaction (not EIP-1559) and sign with `EIP155Signer(chainID)`.\n6. Send transaction.\n7. Poll for receipt until timeout.\n8. If receipt status is not successful, return an error.\n9. Return `TxResult` summary used by the keeper service to record execution history.

### Receipt polling

`waitReceipt`:\n\n- polls `TransactionReceipt` every `pollInterval`\n- treats “not found” as “not mined yet”\n- times out after `receiptTimeout`

## Failure modes

- invalid private key format → constructor error\n- gas estimation fails → execute error\n- RPC send fails → execute error\n- receipt never appears → timeout error\n- receipt shows revert (`status != 1`) → execute error\n\nAll of these are recorded by the keeper service as failed executions/incidents.

## Source pointers

- `apps/backend/internal/keeper/executor.go`\n- `apps/backend/internal/ethops/failover.go`\n- `apps/backend/internal/ethops/caller.go`

