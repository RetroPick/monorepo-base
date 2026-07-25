# Operator Frontend Scaffold

## Purpose

The operator frontend is an internal dashboard aligned with [../../.operator/.runbook.md](../../.operator/.runbook.md). It displays protocol health, keeper state, oracle state, recovery state, and prepared privileged actions.

## Views

| View | Primary data | Critical states |
|---|---|---|
| Global health | `getOperatorGlobalView` projection | paused, yield router disabled, unreconciled recovery, role drift |
| Templates | `getOperatorTemplateView` projections | user ops blocked, unsafe to unpause, rolling halted |
| Epoch detail | `getEpochView` projection | claimable, refund mode, oracle checkpoints, routed principal |
| Keeper schedule | `keeper_schedule`, `keeper_executions` | expired windows, skipped jobs, failed txs |
| Oracle health | `oracle_health`, feed registry | stale feed, heartbeat pressure, cursor reset |
| Recovery | operator views and incidents | unreconciled recovered, routed claims, router disabled |
| Governance/module audit | dispatcher events | module registration, selector mapping, upgrade |
| Incidents | `incidents`, `audit_log` | open critical incident, unresolved action items |

## Always-Visible Header

Show:

- environment
- chain id
- proxy address
- current block and indexer lag
- `globalPaused`
- `yieldRouterDisabled`
- `totalUnreconciledRecovered`
- latest critical alert

## Prepared Actions

Operator UI may prepare but should not silently execute:

- pause/unpause
- initialize market
- open/lock/resolve/cancel manual epoch
- genesis/execute/halt/reset rolling lifecycle
- set oracle adapters
- reset oracle cursor
- withdraw fees
- yield emergency recovery
- module allow/register/route
- upgrade

Prepared action output must include:

- target address
- ABI/function
- decoded args
- encoded calldata
- required role
- expected events
- validation checklist
- production approval requirement

## Live Refresh

Use explicit live refresh buttons for:

- global operator state
- template operator state
- epoch view
- module selector routing
- adapter addresses

Default polling uses API/Postgres projections. Live refresh should be visible as an operator action because it consumes public RPC and may differ from indexed state.

## Critical Banners

Display blocking banners for:

- `globalPaused == true`
- `yieldRouterDisabled == true`
- `totalUnreconciledRecovered > 0`
- any template `unsafeToUnpauseForTemplate == true`
- rolling halted with non-zero halt reason
- unexpected `Upgraded`
- unexpected module or selector event
- stale oracle health for an active template

## Environment Rules

Base Sepolia:

- show faucet/test token utilities
- allow testnet-only operational drills
- label mock token clearly

Base mainnet:

- hide faucet utilities
- require Safe/governance action path labels
- require release-record links before showing go-live readiness
- never imply a mainnet deployment exists until a mainnet address registry is present
