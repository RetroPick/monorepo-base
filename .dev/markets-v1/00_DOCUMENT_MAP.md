# Document map — RetroPick Markets V1

**Last updated:** 2026-07-25
**Status column:** `draft` | `reviewed` | `stale`

## Description

This document map is the **canonical inventory** of Markets V1 documentation paths with category and status (`draft` | `reviewed` | `stale`). Start here after the README when you need the right authority for a claim — PRDs, research evidence, architecture/ADRs, polymarket, intelligence, backend/web/android design, security/platform/testing, phases, or agent-harness.

It complements [README.md](README.md) (consume order) without duplicating phase math or task status. Machine harness paths are under `agent-harness/*.yaml`; product code is never listed as “spec complete.” When adding a new `.md`, append it here and give it `## Description` then `## 0. Developer intent (5W+1H)`.

**How to navigate:** find the category → open the reviewed path → read that doc’s Description and §0 intent → follow Purpose/Scope. Prefer ADRs for decisions, research for time-sensitive EV claims, phases for sequencing, and harness files for tasks.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before using the index table below.

**Documentation convention:** every Markets V1 markdown under `.dev/markets-v1/` starts with `## Description` then `## 0. Developer intent (5W+1H)`, immediately after title and metadata, before the first body heading. Indexes (this document map, [README.md](README.md)) are navigation-focused; deep specs carry domain-specific descriptions and 5W+1H tables.

The 5W+1H table below is a **navigation aid** only. It does not replace Status values (`draft` | `reviewed` | `stale`) or the numbered path inventory; if anything conflicts, the table rows win for “does this file exist / what category.”

| Lens | Answer |
|------|--------|
| **Who** | Agents locating the right reviewed doc before coding; orchestrators checking corpus coverage; reviewers verifying a change has a home category (PRD, architecture, polymarket, intelligence, backend, web, android, research, phases, harness). |
| **What** | Canonical inventory of Markets V1 documentation paths with category and status. Starts with root PRDs (01–05), research evidence pack, architecture/ADRs, polymarket integration, intelligence, backend/web/android design, security/platform/testing, phases, and agent-harness. Complements [README.md](README.md) (consume order) without duplicating phase math. |
| **When** | After README orientation, before deep-reading a phase or ADR. Re-check when adding a new `.md` (must appear here and carry §0 intent), when marking `stale`, or when an agent cannot find an authority for a claim. |
| **Where** | This file: `.dev/markets-v1/00_DOCUMENT_MAP.md`. Linked relatives are under `.dev/markets-v1/**`. Machine harness paths: `agent-harness/*.yaml`. Product code is never listed as authority for “spec complete.” |
| **Why** | A 100+ doc corpus without an index causes agents to invent APIs, miss research evidence (EV-IDs), or edit the wrong product tree. The map makes category and review status explicit so scope debates resolve to a path. |
| **How** | Find the category → open the reviewed path → read that doc’s §0 intent → follow its Purpose/Scope. Prefer ADRs for decisions, research for time-sensitive claims, phases for sequencing, harness for tasks. Do not remove or reorder existing table rows casually; append new numbered entries when docs are added. |

### Worked example

**Happy path — “where is CLOB order lifecycle?”**

1. Scan Category = `polymarket` → [polymarket/ORDER_LIFECYCLE.md](polymarket/ORDER_LIFECYCLE.md).
2. Confirm Status = `reviewed`.
3. Read that doc’s §0 + Purpose; cross-check evidence in [research/EVIDENCE_REGISTER.md](research/EVIDENCE_REGISTER.md) / YAML before implementing PHASE-3 tasks.

**Happy path — “is Android in scope for this task?”**

1. Root PRD [02_SCOPE_AND_CAPABILITY_MATRIX.md](02_SCOPE_AND_CAPABILITY_MATRIX.md) for tier.
2. Design rows under `design/android` + research [ANDROID_AND_PLAY_CURRENT_STATE.md](research/ANDROID_AND_PLAY_CURRENT_STATE.md).
3. Implementation only if `current_phase` / task-graph authorizes PHASE-5 work.

**Failure / Never**

- Treating an absent path as license to invent endpoints not in [schemas/openapi/markets-v1.yaml](../../schemas/openapi/markets-v1.yaml).
- Using `stale` docs as launch authority without revalidation.
- Skipping research EV records for contract addresses or collateral claims.

**Agent checklist**

- [ ] Path present in map?
- [ ] Status reviewed (or explicitly accepted draft)?
- [ ] Right category for the claim?
- [ ] Linked §0 intent read?
- [ ] Harness task still required?

**Reading tip:** Treat this file as a library card catalog — navigate, then deep-read. Keep the existing numbered table intact; the convention note above is the durable rule for new markdown.

| # | Path | Category | Status |
|---|------|----------|--------|
| 1 | [README.md](README.md) | root | reviewed |
| 2 | [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) | PRD | reviewed |
| 3 | [01_EXECUTIVE_PRODUCT_SPEC.md](01_EXECUTIVE_PRODUCT_SPEC.md) | PRD | reviewed |
| 4 | [02_SCOPE_AND_CAPABILITY_MATRIX.md](02_SCOPE_AND_CAPABILITY_MATRIX.md) | PRD | reviewed |
| 5 | [03_BUSINESS_MODEL_AND_UNIT_ECONOMICS.md](03_BUSINESS_MODEL_AND_UNIT_ECONOMICS.md) | PRD | reviewed |
| 6 | [04_REQUIREMENTS_AND_TRACEABILITY.md](04_REQUIREMENTS_AND_TRACEABILITY.md) | PRD | reviewed |
| 7 | [05_NON_FUNCTIONAL_REQUIREMENTS.md](05_NON_FUNCTIONAL_REQUIREMENTS.md) | PRD | reviewed |
| 8 | [research/EVIDENCE_REGISTER.md](research/EVIDENCE_REGISTER.md) | research | reviewed |
| 9 | [research/evidence-register.yaml](research/evidence-register.yaml) | research | reviewed |
| 10 | [research/POLYMARKET_CURRENT_STATE.md](research/POLYMARKET_CURRENT_STATE.md) | research | reviewed |
| 11 | [research/ANDROID_AND_PLAY_CURRENT_STATE.md](research/ANDROID_AND_PLAY_CURRENT_STATE.md) | research | reviewed |
| 12 | [research/OPEN_SOURCE_REFERENCE_AUDIT.md](research/OPEN_SOURCE_REFERENCE_AUDIT.md) | research | reviewed |
| 13 | [research/open-source-provenance.yaml](research/open-source-provenance.yaml) | research | reviewed |
| 14 | [research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md](research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md) | research | reviewed |
| 15 | [architecture/EXISTING_REPOSITORY_AUDIT.md](architecture/EXISTING_REPOSITORY_AUDIT.md) | architecture | reviewed |
| 16 | [architecture/TARGET_MONOREPO_ARCHITECTURE.md](architecture/TARGET_MONOREPO_ARCHITECTURE.md) | architecture | reviewed |
| 17 | [architecture/SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md](architecture/SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md) | architecture | reviewed |
| 18 | [architecture/DEPLOYMENT_ARCHITECTURE.md](architecture/DEPLOYMENT_ARCHITECTURE.md) | architecture | reviewed |
| 19 | [architecture/FAILURE_DOMAINS_AND_DEGRADED_MODES.md](architecture/FAILURE_DOMAINS_AND_DEGRADED_MODES.md) | architecture | reviewed |
| 20 | [architecture/adr/README.md](architecture/adr/README.md) | architecture | reviewed |
| 21 | [architecture/adr/ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md](architecture/adr/ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md) | architecture | reviewed |
| 22 | [architecture/adr/ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md](architecture/adr/ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md) | architecture | reviewed |
| 23 | [architecture/adr/ADR-003-WALLET-AND-SIGNING-MODEL.md](architecture/adr/ADR-003-WALLET-AND-SIGNING-MODEL.md) | architecture | reviewed |
| 24 | [architecture/adr/ADR-004-SHARED-WEB-ANDROID-API.md](architecture/adr/ADR-004-SHARED-WEB-ANDROID-API.md) | architecture | reviewed |
| 25 | [architecture/adr/ADR-005-REALTIME-AND-RECONCILIATION.md](architecture/adr/ADR-005-REALTIME-AND-RECONCILIATION.md) | architecture | reviewed |
| 26 | [architecture/adr/ADR-006-ANDROID-JETPACK-COMPOSE.md](architecture/adr/ADR-006-ANDROID-JETPACK-COMPOSE.md) | architecture | reviewed |
| 27 | [architecture/adr/ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md](architecture/adr/ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md) | architecture | reviewed |
| 28 | [architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md](architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md) | architecture | reviewed |
| 29 | [architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md](architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md) | architecture | reviewed |
| 30 | [polymarket/CAPABILITY_AND_DEPENDENCY_MATRIX.md](polymarket/CAPABILITY_AND_DEPENDENCY_MATRIX.md) | polymarket | reviewed |
| 31 | [polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md](polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md) | polymarket | reviewed |
| 32 | [polymarket/CONTRACT_ABI_AND_ADDRESS_REGISTRY.md](polymarket/CONTRACT_ABI_AND_ADDRESS_REGISTRY.md) | polymarket | reviewed |
| 33 | [polymarket/AUTHENTICATION_AND_ACCOUNT_WALLETS.md](polymarket/AUTHENTICATION_AND_ACCOUNT_WALLETS.md) | polymarket | reviewed |
| 34 | [polymarket/BUILDER_RELAYER_AND_FEES.md](polymarket/BUILDER_RELAYER_AND_FEES.md) | polymarket | reviewed |
| 35 | [polymarket/MARKET_DATA_AND_REALTIME.md](polymarket/MARKET_DATA_AND_REALTIME.md) | polymarket | reviewed |
| 36 | [polymarket/ORDER_LIFECYCLE.md](polymarket/ORDER_LIFECYCLE.md) | polymarket | reviewed |
| 37 | [polymarket/FUNDS_DEPOSIT_AND_WITHDRAWAL.md](polymarket/FUNDS_DEPOSIT_AND_WITHDRAWAL.md) | polymarket | reviewed |
| 38 | [polymarket/POSITIONS_CTF_AND_REDEMPTION.md](polymarket/POSITIONS_CTF_AND_REDEMPTION.md) | polymarket | reviewed |
| 39 | [polymarket/NEGATIVE_RISK_AND_AUGMENTED_MARKETS.md](polymarket/NEGATIVE_RISK_AND_AUGMENTED_MARKETS.md) | polymarket | reviewed |
| 40 | [polymarket/COMBOS_CAPABILITY_GATE.md](polymarket/COMBOS_CAPABILITY_GATE.md) | polymarket | reviewed |
| 41 | [polymarket/UPSTREAM_CHANGE_MANAGEMENT.md](polymarket/UPSTREAM_CHANGE_MANAGEMENT.md) | polymarket | reviewed |
| 42 | [intelligence/TRADER_INTELLIGENCE_PRODUCT_SPEC.md](intelligence/TRADER_INTELLIGENCE_PRODUCT_SPEC.md) | intelligence | reviewed |
| 43 | [intelligence/OPEN_SOURCE_ADOPTION_MAP.md](intelligence/OPEN_SOURCE_ADOPTION_MAP.md) | intelligence | reviewed |
| 44 | [intelligence/WHALE_AND_LARGE_TRADE_DETECTION.md](intelligence/WHALE_AND_LARGE_TRADE_DETECTION.md) | intelligence | reviewed |
| 45 | [intelligence/WALLET_PROFILING_AND_SMART_MONEY.md](intelligence/WALLET_PROFILING_AND_SMART_MONEY.md) | intelligence | reviewed |
| 46 | [intelligence/MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md](intelligence/MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md) | intelligence | reviewed |
| 47 | [intelligence/ALERT_RULES_AND_DELIVERY.md](intelligence/ALERT_RULES_AND_DELIVERY.md) | intelligence | reviewed |
| 48 | [intelligence/UNUSUAL_ACTIVITY_HEURISTICS.md](intelligence/UNUSUAL_ACTIVITY_HEURISTICS.md) | intelligence | reviewed |
| 49 | [intelligence/RELATIONSHIP_AND_ARBITRAGE_SCANNER.md](intelligence/RELATIONSHIP_AND_ARBITRAGE_SCANNER.md) | intelligence | reviewed |
| 50 | [intelligence/SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md](intelligence/SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md) | intelligence | reviewed |
| 51 | [backend/BACKEND_ARCHITECTURE.md](backend/BACKEND_ARCHITECTURE.md) | backend | reviewed |
| 52 | [backend/SERVICE_AND_MODULE_BOUNDARIES.md](backend/SERVICE_AND_MODULE_BOUNDARIES.md) | backend | reviewed |
| 53 | [backend/DOMAIN_MODEL_AND_STATE_MACHINES.md](backend/DOMAIN_MODEL_AND_STATE_MACHINES.md) | backend | reviewed |
| 54 | [backend/DATABASE_AND_MIGRATIONS.md](backend/DATABASE_AND_MIGRATIONS.md) | backend | reviewed |
| 55 | [backend/INDEXING_RECONCILIATION_AND_REORGS.md](backend/INDEXING_RECONCILIATION_AND_REORGS.md) | backend | reviewed |
| 56 | [backend/CACHE_QUEUE_AND_RATE_LIMITING.md](backend/CACHE_QUEUE_AND_RATE_LIMITING.md) | backend | reviewed |
| 57 | [backend/API_AND_REALTIME_CONTRACTS.md](backend/API_AND_REALTIME_CONTRACTS.md) | backend | reviewed |
| 58 | [backend/AUTH_SESSION_AND_ELIGIBILITY.md](backend/AUTH_SESSION_AND_ELIGIBILITY.md) | backend | reviewed |
| 59 | [backend/NOTIFICATIONS.md](backend/NOTIFICATIONS.md) | backend | reviewed |
| 60 | [backend/BACKEND_TEST_STRATEGY.md](backend/BACKEND_TEST_STRATEGY.md) | backend | reviewed |
| 61 | [web/WEB_PRODUCT_INFORMATION_ARCHITECTURE.md](web/WEB_PRODUCT_INFORMATION_ARCHITECTURE.md) | design/web | reviewed |
| 62 | [web/WEB_APPLICATION_ARCHITECTURE.md](web/WEB_APPLICATION_ARCHITECTURE.md) | design/web | reviewed |
| 63 | [web/DESIGN_SYSTEM_AND_ACCESSIBILITY.md](web/DESIGN_SYSTEM_AND_ACCESSIBILITY.md) | design/web | reviewed |
| 64 | [web/WALLET_AND_TRANSACTION_UX.md](web/WALLET_AND_TRANSACTION_UX.md) | design/web | reviewed |
| 65 | [web/MARKET_AND_ORDERBOOK_UX.md](web/MARKET_AND_ORDERBOOK_UX.md) | design/web | reviewed |
| 66 | [web/PORTFOLIO_FUNDING_AND_REDEMPTION_UX.md](web/PORTFOLIO_FUNDING_AND_REDEMPTION_UX.md) | design/web | reviewed |
| 67 | [web/ERROR_DEGRADED_AND_RECOVERY_UX.md](web/ERROR_DEGRADED_AND_RECOVERY_UX.md) | design/web | reviewed |
| 68 | [web/WEB_TEST_STRATEGY.md](web/WEB_TEST_STRATEGY.md) | design/web | reviewed |
| 69 | [android/ANDROID_PRODUCT_SCOPE.md](android/ANDROID_PRODUCT_SCOPE.md) | design/android | reviewed |
| 70 | [android/COMPOSE_APP_ARCHITECTURE.md](android/COMPOSE_APP_ARCHITECTURE.md) | design/android | reviewed |
| 71 | [android/GRADLE_MODULE_GRAPH.md](android/GRADLE_MODULE_GRAPH.md) | design/android | reviewed |
| 72 | [android/NAVIGATION_AND_DEEP_LINKS.md](android/NAVIGATION_AND_DEEP_LINKS.md) | design/android | reviewed |
| 73 | [android/STATE_DATA_OFFLINE_AND_REALTIME.md](android/STATE_DATA_OFFLINE_AND_REALTIME.md) | design/android | reviewed |
| 74 | [android/WALLET_SIGNING_AND_SECURITY.md](android/WALLET_SIGNING_AND_SECURITY.md) | design/android | reviewed |
| 75 | [android/NOTIFICATIONS_AND_BACKGROUND_WORK.md](android/NOTIFICATIONS_AND_BACKGROUND_WORK.md) | design/android | reviewed |
| 76 | [android/ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md](android/ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md) | design/android | reviewed |
| 77 | [android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md](android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md) | design/android | reviewed |
| 78 | [android/ANDROID_TEST_STRATEGY.md](android/ANDROID_TEST_STRATEGY.md) | design/android | reviewed |
| 79 | [security/THREAT_MODEL.md](security/THREAT_MODEL.md) | rules/security | reviewed |
| 80 | [security/ASSET_AND_DATA_CLASSIFICATION.md](security/ASSET_AND_DATA_CLASSIFICATION.md) | rules/security | reviewed |
| 81 | [security/SIGNING_AND_TRANSACTION_INTEGRITY.md](security/SIGNING_AND_TRANSACTION_INTEGRITY.md) | rules/security | reviewed |
| 82 | [security/SECRETS_KEYS_AND_ACCESS_CONTROL.md](security/SECRETS_KEYS_AND_ACCESS_CONTROL.md) | rules/security | reviewed |
| 83 | [security/SUPPLY_CHAIN_AND_SBOM.md](security/SUPPLY_CHAIN_AND_SBOM.md) | rules/security | reviewed |
| 84 | [security/ABUSE_FRAUD_AND_RATE_LIMITS.md](security/ABUSE_FRAUD_AND_RATE_LIMITS.md) | rules/security | reviewed |
| 85 | [security/SECURITY_TEST_AND_REVIEW_PLAN.md](security/SECURITY_TEST_AND_REVIEW_PLAN.md) | rules/security | reviewed |
| 86 | [security/INCIDENT_RESPONSE.md](security/INCIDENT_RESPONSE.md) | rules/security | reviewed |
| 87 | [platform/ENVIRONMENT_AND_CONFIGURATION.md](platform/ENVIRONMENT_AND_CONFIGURATION.md) | production | reviewed |
| 88 | [platform/INFRASTRUCTURE_AND_COST_MODEL.md](platform/INFRASTRUCTURE_AND_COST_MODEL.md) | production | reviewed |
| 89 | [platform/CI_CD_PIPELINE.md](platform/CI_CD_PIPELINE.md) | production | reviewed |
| 90 | [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](platform/OBSERVABILITY_SLOS_AND_ALERTS.md) | production | reviewed |
| 91 | [platform/BACKUP_RESTORE_AND_DISASTER_RECOVERY.md](platform/BACKUP_RESTORE_AND_DISASTER_RECOVERY.md) | production | reviewed |
| 92 | [platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md](platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md) | production | reviewed |
| 93 | [platform/PRODUCTION_OPERATIONS_RUNBOOK.md](platform/PRODUCTION_OPERATIONS_RUNBOOK.md) | production | reviewed |
| 94 | [testing/MASTER_TEST_PLAN.md](testing/MASTER_TEST_PLAN.md) | testing | reviewed |
| 95 | [testing/TEST_PYRAMID_AND_ENVIRONMENTS.md](testing/TEST_PYRAMID_AND_ENVIRONMENTS.md) | testing | reviewed |
| 96 | [testing/CONTRACT_AND_CONFORMANCE_TESTS.md](testing/CONTRACT_AND_CONFORMANCE_TESTS.md) | testing | reviewed |
| 97 | [testing/END_TO_END_CRITICAL_JOURNEYS.md](testing/END_TO_END_CRITICAL_JOURNEYS.md) | testing | reviewed |
| 98 | [testing/LOAD_CHAOS_AND_RESILIENCE.md](testing/LOAD_CHAOS_AND_RESILIENCE.md) | testing | reviewed |
| 99 | [testing/RELEASE_VERIFICATION_MATRIX.md](testing/RELEASE_VERIFICATION_MATRIX.md) | testing | reviewed |
| 100 | [phases/README.md](phases/README.md) | production/phases | reviewed |
| 101 | [phases/PHASE-0-DISCOVERY-AND-SPEC-FREEZE.md](phases/PHASE-0-DISCOVERY-AND-SPEC-FREEZE.md) | production/phases | reviewed |
| 102 | [phases/PHASE-1-FOUNDATION-AND-READ-MARKETS.md](phases/PHASE-1-FOUNDATION-AND-READ-MARKETS.md) | production/phases | reviewed |
| 103 | [phases/PHASE-2-ACCOUNT-WALLET-AND-FUNDING.md](phases/PHASE-2-ACCOUNT-WALLET-AND-FUNDING.md) | production/phases | reviewed |
| 104 | [phases/PHASE-3-WEB-TRADING-CORE.md](phases/PHASE-3-WEB-TRADING-CORE.md) | production/phases | reviewed |
| 105 | [phases/PHASE-4-PORTFOLIO-REDEMPTION-AND-WITHDRAWAL.md](phases/PHASE-4-PORTFOLIO-REDEMPTION-AND-WITHDRAWAL.md) | production/phases | reviewed |
| 106 | [phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md](phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md) | production/phases | reviewed |
| 107 | [phases/PHASE-6-HARDENING-CI-CD-AND-SRE.md](phases/PHASE-6-HARDENING-CI-CD-AND-SRE.md) | production/phases | reviewed |
| 108 | [phases/PHASE-7-PRODUCTION-LAUNCH.md](phases/PHASE-7-PRODUCTION-LAUNCH.md) | production/phases | reviewed |
| 109 | [phases/PHASE-8-POST-V1-ADVANCED-CAPABILITIES.md](phases/PHASE-8-POST-V1-ADVANCED-CAPABILITIES.md) | production/phases | reviewed |
| 110 | [agent-harness/AGENT_OPERATING_CONTRACT.md](agent-harness/AGENT_OPERATING_CONTRACT.md) | harness | reviewed |
| 111 | [agent-harness/implementation-manifest.yaml](agent-harness/implementation-manifest.yaml) | harness | reviewed |
| 112 | [agent-harness/task-graph.yaml](agent-harness/task-graph.yaml) | harness | reviewed |
| 113 | [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md) | harness | reviewed |
| 114 | [agent-harness/PHASE_GATE_TEMPLATE.md](agent-harness/PHASE_GATE_TEMPLATE.md) | harness | reviewed |
| 115 | [agent-harness/TASK_SPEC_TEMPLATE.md](agent-harness/TASK_SPEC_TEMPLATE.md) | harness | reviewed |
| 116 | [agent-harness/AGENT_HANDOFF_TEMPLATE.md](agent-harness/AGENT_HANDOFF_TEMPLATE.md) | harness | reviewed |
| 117 | [agent-harness/VERIFICATION_EVIDENCE_TEMPLATE.md](agent-harness/VERIFICATION_EVIDENCE_TEMPLATE.md) | harness | reviewed |
| 118 | [agent-harness/DECISION_AND_ASSUMPTION_LOG.md](agent-harness/DECISION_AND_ASSUMPTION_LOG.md) | harness | reviewed |
| 119 | [agent-harness/BLOCKERS_AND_HUMAN_APPROVALS.md](agent-harness/BLOCKERS_AND_HUMAN_APPROVALS.md) | harness | reviewed |
| 120 | [EXECUTIVE_OUTCOME.md](EXECUTIVE_OUTCOME.md) | root | reviewed |
| 121 | [agent-harness/INVARIANT_CHECK.md](agent-harness/INVARIANT_CHECK.md) | harness | reviewed |
