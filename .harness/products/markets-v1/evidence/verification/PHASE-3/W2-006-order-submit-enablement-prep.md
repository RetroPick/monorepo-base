# W2-006 — Order-submit enablement preparation

**Date:** 2026-08-12
**Scope:** Evidence and governance only. No environment setting, secret, credential, deployment, capability, or order was changed.
**Verdict:** **NOT ENABLED — BLK-004 remains open.** The local staging-like runtime remains fail-closed; a controlled staging rehearsal requires human approval and live CLOB L2 credential wiring.

## 1. What was verified

### 1.1 Fail-closed runtime baseline

Read-only probes against the existing local `markets-api` process returned:

| Probe | Result | Meaning |
|---|---:|---|
| `GET /api/v1/health/live` | `200` | Process is alive. |
| `GET /api/v1/health/ready` | `200`, degraded | Database is reachable; catalog worker/projection are degraded. This is not a staging-ready trading approval. |
| `GET /api/v1/markets/capabilities` | `200`, `features.order_submit:false` | Public order-submit capability remains disabled. |
| `GET /api/v1/metrics` | `404` | This process does not expose metrics at that path; no metric claim is made. |

No write endpoint was called. `MARKETS_ORDER_SUBMIT_ENABLED` was not set, unset, changed, or inspected for its value.

### 1.2 Code-path and build evidence

Command run from `apps/backend`:

```text
go test ./internal/markets/orders/... ./internal/markets/clob/... -count=1
go build -o /tmp/markets-api-w2-006 ./cmd/markets-api
```

Result:

```text
ok  retropick/apps/backend/internal/markets/orders  0.193s
ok  retropick/apps/backend/internal/markets/clob    0.265s
# build succeeded
```

Static assertions also passed for all of the following:

1. `internal/markets/service.go` publishes `order_submit:false`.
2. `orders.SubmitOrder` returns capability-disabled before request processing when the runtime gate is off.
3. `NewProductionService` requires a PostgreSQL mutation journal; without one it forces `submitEnabled=false`.

Targeted test output additionally confirmed `TestSubmitOrderCapabilityDisabled` passes. PostgreSQL integration tests are correctly present but were **skipped** because `DATABASE_URL` was not supplied to this task. No database credentials were sought or used.

### 1.3 Durable-journal boundary

The production factory creates `PostgresMutationJournal` only from a `*pgxpool.Pool`; a missing journal overrides an otherwise requested enabled setting to false. The journal tests cover concurrent idempotency, crash-after-attempt no-resubmit, and response-loss recovery. They were not run against a task-provided database, so this is code/test evidence, not a new staging end-to-end journal proof.

### 1.4 Credential readiness

The live `cmd/markets-api` path currently constructs `clob.UnwiredCredentialProvider{}` for reconcile. The orders production factory also defaults to that provider if no provider is injected. Its `Credentials` method returns `ErrCredentialsUnwired`. Consequently, setting only `MARKETS_ORDER_SUBMIT_ENABLED=true` would not constitute safe live CLOB enablement and must not be used to claim venue readiness.

## 2. CLOB credential and human-gate requirements

The authenticated Polymarket CLOB path requires a server-side, authenticated-session credential provider that resolves all of:

| Required input | `L2Credentials` field | Handling requirement |
|---|---|---|
| CLOB L2 API key | `APIKey` | Secret manager only; never git, logs, evidence, or chat. |
| CLOB L2 HMAC secret | `Secret` | Secret manager only; rotate on suspected exposure. |
| CLOB L2 passphrase | `Passphrase` | Secret manager only. |
| Authorized signer EOA | `SignerAddress` | Must bind to the approved limited staging test wallet/session. |
| CLOB API base URL | `MARKETS_CLOB_API_URL` | Approved Polymarket CLOB endpoint; validate deployment configuration. |
| Builder code, if attributed flow is intended | `MARKETS_BUILDER_CODE` | Staging Builder configuration only; distinct from PHASE-7 production Builder credentials. |

Requirements before a rehearsal that can reach the venue:

- Engineering review that a session-scoped `CredentialProvider` is wired into submit, cancel, and reconciliation paths; `UnwiredCredentialProvider` is not sufficient.
- Ops provision the L2 values in the staging secret manager, with access limited to the deploy identity; no credential values in this evidence pack.
- A dedicated, minimally funded test wallet—not customer or treasury funds—and an approved signing policy.
- Explicit recorded approval for the **Real on-chain transaction** gate. This approval is mandatory even when the target environment is called staging because the official CLOB venue write is a real external side effect.
- BLK-001 eligibility proof (`eligible:true` for approved staging egress) before asserting the happy path. If it remains unavailable, only a non-write fail-closed/partial rehearsal may be recorded.

## 3. Enablement checklist — controlled staging only

This checklist authorizes preparation and evidence collection; it does **not** authorize an agent to flip a switch.

### A. Preconditions (all required before any venue-write window)

- [ ] Named ops owner and time-bounded staging change window recorded.
- [ ] Production and all non-staging manifests audited: `MARKETS_ORDER_SUBMIT_ENABLED` absent or false.
- [ ] Staging target, deployment digest, and rollback owner identified; `ENVIRONMENT=staging` verified by ops.
- [ ] BLK-001 has allowed-region `eligible:true` evidence, or the proposed rehearsal is explicitly limited to non-write fail-closed evidence.
- [ ] Security/ops approval for the Real on-chain transaction gate is recorded with approver and date.
- [ ] Dedicated limited-funds test wallet and signing policy approved.
- [ ] Engineering sign-off confirms the durable PostgreSQL migration/journal is deployed and healthy.
- [ ] Engineering sign-off confirms a non-unwired, session-appropriate L2 credential provider is deployed for submit, cancel, and reconciliation.
- [ ] CLOB L2/Builder secrets exist only in staging secret storage; values are not copied into tickets, docs, or shell history.
- [ ] Reconcile worker is enabled and its read-only unknown-order repair path is observable.

### B. Required evidence during the window

- [ ] Before the change, authenticated submit and cancel are shown fail-closed (`503 capability_disabled`); redact cookie, body, ids, and wallet.
- [ ] Redacted configuration/digest evidence proves **only staging** received the time-boxed runtime setting.
- [ ] After redeploy, `GET /markets/capabilities` is recorded as `order_submit:false`; this public product capability is deliberately independent from the runtime gate.
- [ ] A valid preview is produced from an eligible, authenticated test session; content hash and unsigned payload are preserved only in redacted form.
- [ ] For full BLK-004 proof only: wallet signs the preview and submit returns a real `201` result with a redacted venue order identifier, or returns `unknown` for the recovery exercise.
- [ ] Journal evidence links one idempotency key to one durable local order/attempt and one outbound venue attempt; do not expose signed payload or secrets.
- [ ] Timeout/recovery exercise proves `unknown_reconciling` is polled/reconciled with no second `POST /order` by BFF, client, or worker.
- [ ] Reconciliation reaches a terminal/projection-repaired state or the bounded incident path is documented.
- [ ] Optional resting-order cancellation is performed only under the same approval and recorded with redacted evidence.

### C. Rollback and closeout (required)

- [ ] Ops removes or sets false `MARKETS_ORDER_SUBMIT_ENABLED` in **staging only** and redeploys.
- [ ] Authenticated submit and cancel again return `503 capability_disabled`.
- [ ] `features.order_submit` remains false after rollback.
- [ ] Existing unknown/recovery rows are reconciled read-only; rollback must not cause a resubmit.
- [ ] Ops records end timestamp, evidence locations, and any order disposition; rotates staging L2 credentials if policy or incident response requires it.
- [ ] The human owner—not an agent—decides whether the evidence meets BLK-004 full-clearance criteria.

## 4. Explicit non-claims and remaining blockers

- No staging or production kill switch was enabled by this task.
- No Polymarket credential, secret, cookie, wallet key, or real order was used.
- No live venue acknowledgement, journal row, or sandbox run is claimed.
- BLK-001 remains open according to its latest staging evidence, so the eligible happy path is not currently available.
- BLK-004 is re-scoped to the remaining external readiness gap: live/session L2 credential-provider wiring, controlled staging proof, and required human approval—not missing submit implementation.

## 5. Related sources

- `internal/markets/orders/factory.go`
- `internal/markets/orders/submit.go`
- `internal/markets/clob/credentials.go`
- `cmd/markets-api/main.go`
- [MKT-P3-006 exit-gate analysis](./MKT-P3-006-exit-gate-analysis.md)
- [BLK-004 staging checklist](./MKT-P3-BLK004-staging-checklist.md)
- [Blockers and Human Approvals](../../governance/BLOCKERS_AND_HUMAN_APPROVALS.md)
