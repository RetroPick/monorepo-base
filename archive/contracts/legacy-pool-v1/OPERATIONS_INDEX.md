# RetroPick V1 Operations Index

## Purpose

Entry point for the RetroPick V1 production operations document set (operators, Safe signers, governance, treasury, oracle ops, auditors).

Read these docs as operational controls, not just reference notes.

## Reading order

### 1. Production overview

- [`.operator/.production.md`](.operator/.production.md) — Safe setup, governance topology, mainnet deployment, validation, upgrades

### 2. Live operations

- [`.operator/.runbook.md`](.operator/.runbook.md) — day-to-day ops, pause/unpause, router/oracle/rolling incidents

### 3. Governance and change control

- [`.operator/.governance.md`](.operator/.governance.md) — change classes, approvals, upgrade posture

### 4. Oracle and reporter operations

- [`.operator/.oracle_ops.md`](.operator/.oracle_ops.md) — oracle matrix, adapters, trusted reporter

### 5. Module release control

- [`.operator/.module_release.md`](.operator/.module_release.md) — bytecode release, selector allowlisting

### 6. Market types (operator)

- [`.operator/.marketType.md`](.operator/.marketType.md) — launch approval by market type

## Technical reference

- [`currentSmartContract.md`](currentSmartContract.md) — protocol reference
- [`rollingMarket.md`](rollingMarket.md) — rolling execution mode

## Audit and security context

- [`.audit/fixed/1/1_Report.md`](.audit/fixed/1/1_Report.md) — main narrative audit report
- [`.audit/fixed/1/1_byHashLock.md`](.audit/fixed/1/1_byHashLock.md) — finding reconciliation matrix

## Draft supplemental ops (archive)

Draft playbooks moved to [`docs/archive/design/smart-contract-audit-future/`](../../docs/archive/design/smart-contract-audit-future/). Prefer `.operator/.runbook.md` when guidance conflicts.

## Deployment and code surfaces

| Surface | Path |
|---------|------|
| Production deploy | [`script/production/DeployProduction.s.sol`](script/production/DeployProduction.s.sol) |
| Production upgrade | [`script/production/UpgradeProduction.s.sol`](script/production/UpgradeProduction.s.sol) |
| Dispatcher | [`src/engine/MarketEngineDispatcher.sol`](src/engine/MarketEngineDispatcher.sol) |
| Admin module | [`src/engine/modules/MarketEngineAdminModule.sol`](src/engine/modules/MarketEngineAdminModule.sol) |
| Trusted reporter | [`src/oracle/TrustedReporterAdapter.sol`](src/oracle/TrustedReporterAdapter.sol) |

## Environment templates

- [`.env.example`](.env.example)
- [`.env.base-mainnet.example`](.env.base-mainnet.example)

## Minimum mandatory set

Every operator with privileged influence should read:

1. `.operator/.production.md`
2. `.operator/.runbook.md`
3. `.operator/.governance.md`

By role: oracle → `.oracle_ops.md`; governance signers → `.module_release.md`; auditors → `1_Report.md`.

## Repo-wide ops

- Deploy policy: [`PRODUCTION.md`](../../PRODUCTION.md)
- VPS runbook: [`docs/vps-deploy.md`](../../docs/vps-deploy.md)
- Backend health: [`.dev/backend/operations-runbook.md`](../../.dev/backend/operations-runbook.md)
- Ops dashboard workflow: [`docs/feature/ops-admin-operator-workflow.md`](../../docs/feature/ops-admin-operator-workflow.md)
