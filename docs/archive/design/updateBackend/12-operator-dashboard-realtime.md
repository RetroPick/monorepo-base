# 12 — Operator Dashboard Realtime

## 1. Operator channels

```txt
ops:global
ops:keeper
ops:oracle
ops:incidents
ops:template:{templateId}
ops:deposits
ops:indexer
```

## 2. REST snapshots

```http
GET /api/v1/ops/global-state
GET /api/v1/ops/templates
GET /api/v1/ops/templates/{id}/state
GET /api/v1/ops/keeper/schedule
GET /api/v1/ops/keeper/log
GET /api/v1/ops/oracle/health
GET /api/v1/ops/incidents
GET /api/v1/ops/deposits/stuck
GET /api/v1/ops/reconciliation
GET /api/v1/ops/audit
```

## 3. Panels

| Panel | REST | WS |
|---|---|---|
| GlobalHealthBanner | global-state | ops:global |
| KeeperSchedule | keeper/schedule | ops:keeper |
| OracleHealthGrid | oracle/health | ops:oracle |
| IncidentList | incidents | ops:incidents |
| DepositStuckPanel | deposits/stuck | ops:deposits |
| IndexerLagPanel | global-state | ops:indexer |
| VaultSolvencyPanel | reconciliation | ops:global |

## 4. Critical events

```txt
rolling_halted
buffer_pressure
oracle_stale
keeper_tx_failed
indexer_lag_update
vault_solvency_alert
deposit_stuck
incident_opened
```

## 5. Operator auth

```txt
SIWE
operator allowlist
IP restriction/VPN where possible
shorter session expiry
audit every write
```

## 6. Write policy

Operator dashboard should be mostly read-only for V1.

Allowed:

```txt
incident notes
manual review notes
resolve internal incident status
```

Dangerous actions should go through Safe/keeper scripts:

```txt
pause protocol
change template
change oracle
withdraw fees
reset lifecycle
```
