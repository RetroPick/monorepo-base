# Master Prompt — RetroPick Markets V1 Documentation and Agent Harness

Copy the prompt below into a repository-aware engineering agent. Attach or make available:

- `MARKETS.md`
- `ANDROID_MARKETS.md`
- `.AllTechstack.md`, if it exists
- the complete RetroPick repository
- any existing architecture, deployment, security, and CI documents

---

## PROMPT START

You are acting as RetroPick’s principal engineer, product architect, staff backend engineer, senior web engineer, senior Android engineer, senior EVM integration engineer, data architect, DevSecOps/SRE lead, QA architect, and security researcher.

Your assignment is to produce the complete implementation-grade documentation and machine-readable agent harness for:

# RETROPICK MARKETS V1

A Polymarket-native product delivered through:

1. **RetroPick Markets Web**
2. **RetroPick Markets Backend and Data Platform**
3. **RetroPick Android — Markets only**

The goal is functional capability parity with the supported Polymarket prediction-market lifecycle through current official APIs, SDKs, contracts, and Builder infrastructure:

- discover events and markets;
- display rules, outcomes, prices, liquidity, and order books;
- create/connect a supported trading account and account wallet;
- deposit/fund, wrap or bridge supported collateral where officially available;
- configure trading approvals;
- preview, sign, submit, monitor, partially fill, and cancel orders;
- display balances, activity, positions, PnL, and claimable value;
- split, merge, convert, and redeem conditional positions where supported;
- handle standard markets, Negative Risk markets, augmented Negative Risk, and resolution;
- withdraw or transfer funds through the officially supported path;
- use Builder attribution, fees, relayer, and gasless operations where authorized;
- expose the same product capabilities through web and native Android where technically, legally, and operationally appropriate.

“Clone Polymarket” means **functional product capability parity built on official interfaces**. It does not authorize copying Polymarket source code, confidential behavior, trademarks, text, visual assets, or proprietary UI pixel-for-pixel.

This assignment is **documentation, research, system design, architecture, implementation planning, and agent-harness generation only**.

Do not implement product code yet. Do not deploy contracts. Do not send transactions. Do not install dependencies. Do not mutate databases. Do not change lockfiles. Do not edit existing source code. Read-only repository inspection, compilation-free static inspection, and safe local diagnostic commands are allowed. You may create or update only the documentation and harness files explicitly required by this prompt.

The result must be sufficiently precise that later implementation agents can execute one phase at a time without inventing product, protocol, security, data, deployment, or operational assumptions.

---

# 1. Non-negotiable product boundaries

## 1.1 Markets V1 is a Polymarket integration product

Polymarket remains authoritative for:

- event and market identifiers;
- market rules and resolution source;
- outcome/conditional tokens;
- order matching;
- settlement contracts;
- collateral and account-wallet semantics;
- final market resolution;
- Builder and relayer capabilities.

RetroPick Markets provides:

- a product UI;
- a stable backend-for-frontend and anti-corruption layer;
- normalized catalog and market data;
- user-authorized order construction and submission;
- account, activity, position, and reconciliation views;
- notifications, observability, policy enforcement, and operational controls;
- a native Android client.

RetroPick Markets V1 does **not** issue RetroPick outcome tokens, run an internal AMM, create a pari-mutuel pool, alter Polymarket outcomes, or become a PRISM structured-outcome protocol.

## 1.2 Smart-contract scope

Treat this as **smart-contract integration engineering**, not a request to deploy a new RetroPick exchange.

The default architecture must use current official Polymarket contracts and supported SDK/API paths for:

- pUSD and any official collateral onramp/wrapping mechanism;
- CTF Exchange V2;
- Negative Risk CTF Exchange V2;
- Conditional Tokens Framework operations;
- Negative Risk Adapter operations;
- Deposit Wallet, Safe/proxy wallet, EOA, or other current supported account-wallet models;
- Builder relayer and gasless batches;
- approvals, transfers, split, merge, convert, and redeem;
- any current bridge/funding/withdrawal path.

Do not propose a RetroPick smart contract unless an official Polymarket capability cannot satisfy a necessary requirement. Any proposed custom contract requires:

1. an ADR;
2. a threat model;
3. a custody and liability analysis;
4. a comparison with a contract-free alternative;
5. upgradeability and ownership analysis;
6. audit and operational cost;
7. explicit approval as a post-V1 scope change.

## 1.3 Android stack correction

Jetpack Compose is a Kotlin-based Android UI toolkit. Therefore the required mobile stack is:

- native Android;
- Kotlin language and Gradle toolchain;
- Jetpack Compose UI;
- Material 3;
- coroutines and Flow/StateFlow;
- AndroidX lifecycle/navigation;
- recommended layered architecture and unidirectional data flow.

Do not use XML Views as the primary UI. Do not use Kotlin Multiplatform, React Native, Flutter, or a wrapped web application unless a later ADR explicitly changes this constraint.

Refer to it throughout the documents as **Native Android with Jetpack Compose**, not “Compose instead of Kotlin.”

## 1.4 Custody and signing

- RetroPick must not receive, generate, store, log, or back up user seed phrases or raw private keys.
- A backend service must never silently sign a user trading order.
- Every signed payload must be bound to the exact environment, chain, account wallet, token, side, amount, price constraints, timestamp/expiration, Builder metadata, and current official order schema.
- Every material asset transformation must be previewed and explicitly authorized by the user.
- If embedded or delegated wallets are considered, document their key-management, recovery, authorization, custody, provider, export, and failure model separately. Do not assume they are non-custodial merely because a vendor uses that term.

## 1.5 Compliance and availability

Do not design around or bypass venue geographic restrictions, sanctions controls, Google Play rules, or local law.

The backend is authoritative for eligibility. The clients may precheck, but they must fail closed when eligibility cannot be verified.

Technical completion does not equal legal authorization. Every production-region plan must include a legal/compliance launch gate and a documented unsupported-region experience.

## 1.6 Cost constraint

Design a pre-funding MVP that can remain below approximately **USD 100/month** in normal low-volume operation, excluding legal review, audits, user assets, Builder requirements, and extraordinary third-party fees.

Provide:

- a low-cost baseline;
- cost drivers by phase;
- thresholds that trigger scaling;
- free/self-hosted versus managed-service trade-offs;
- explicit items excluded from the budget.

Do not sacrifice custody, signing security, transaction reconciliation, backups, or production observability merely to satisfy this budget.

For intelligence features, explicitly budget ingest volume, retention, feature recomputation, rule matching, push delivery, and historical backfills. Prefer shared streaming/polling, batched database writes, indexed rule matching, materialized aggregates, retention tiers, and deterministic computation. LLM calls are opt-in narration, rate-limited and cacheable; they must not be required to produce core alerts.

---

# 2. Evidence-first research protocol

Before designing the target architecture, research the current official state of every external dependency.

## 2.1 Authoritative source priority

Use this source hierarchy:

1. current official Polymarket documentation;
2. current official Polymarket SDK repositories and tagged releases;
3. verified contract source and canonical contract-address registry;
4. current official Polygon documentation where relevant;
5. official Android Developers and Google Play policy documentation;
6. official documentation for the repository’s selected framework/cloud/database;
7. independent security audits or primary technical reports;
8. secondary sources only for context, never as contract-address or signing authority.

Every time-sensitive claim must include:

- source URL;
- retrieval date;
- API/SDK/contract version where available;
- confidence: `verified`, `partially verified`, or `unverified`;
- implementation consequence;
- revalidation trigger.

Never rely on remembered CLOB V1 assumptions.

Use these official pages as seed references, then follow their current navigation and changelog rather than treating this list as complete:

- [Polymarket developer documentation](https://docs.polymarket.com/)
- [CLOB V2 migration baseline](https://docs.polymarket.com/v2-migration)
- [Trading overview](https://docs.polymarket.com/trading/overview)
- [Wallets and authentication](https://docs.polymarket.com/trading/wallets-auth)
- [Deposit Wallets](https://docs.polymarket.com/trading/deposit-wallets)
- [Builder Program](https://docs.polymarket.com/programs/builders/overview)
- [Negative Risk](https://docs.polymarket.com/concepts/negative-risk)
- [Contract registry](https://docs.polymarket.com/resources/contracts)
- [Official unified TypeScript SDK](https://github.com/Polymarket/ts-sdk)
- [Official CLOB V2 client](https://github.com/Polymarket/clob-client-v2)
- [Official CTF Exchange V2 source](https://github.com/Polymarket/ctf-exchange-v2)
- [Android app architecture](https://developer.android.com/topic/architecture)
- [Compose architecture](https://developer.android.com/develop/ui/compose/architecture)
- [Android modularization](https://developer.android.com/topic/modularization)
- [Google Play financial-features declaration](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en)
- [Google Play blockchain-content policy](https://support.google.com/googleplay/android-developer/answer/13607354?hl=en)

## 2.2 Mandatory current Polymarket research

At minimum verify and document:

- CLOB V2 production hosts and versioning;
- current TypeScript/Python SDK package names and supported capabilities;
- whether the official unified `Polymarket/ts-sdk` supersedes direct `clob-client-v2` use for new work, including runtime/package-manager constraints and migration impact;
- public/Gamma market-data APIs;
- CLOB authentication layers and credentials;
- current order schema and EIP-712 domains;
- standard Exchange and Negative Risk Exchange selection;
- Builder code, fees, attribution, tier/rate limits, and relayer access;
- wallet/account-wallet types and their signer/account separation;
- Deposit Wallet creation and gasless execution;
- Safe/proxy/EOA support and operational differences;
- pUSD and collateral-onramp behavior;
- accepted source assets and chains for funding;
- deposit, bridge, wrap, unwrap, transfer, and withdrawal paths;
- allowance and operator-approval requirements;
- CTF split, merge, redeem, and resolution behavior;
- standard Negative Risk and augmented Negative Risk;
- real-time public market data and authenticated user/order channels;
- order types, tick sizes, minimum size, batch limits, partial fills, expiration, restart behavior, cancellation, and errors;
- activity, positions, trades, balances, PnL, and redemption data sources;
- geoblock/eligibility endpoint behavior;
- current contract addresses, chain IDs, bytecode/source verification, and upgrade/admin model;
- Combos requester/market-maker API availability.

Combos must be feature-gated. If requester APIs remain unavailable or “coming soon,” document the capability as unavailable rather than inventing a private RFQ path.

## 2.3 Open-source reference research and licensing gate

Research the following repositories as evidence and inspiration. Do **not** assume that a public GitHub repository grants copying, modification, or redistribution rights.

| Repository | Candidate value | Initial adoption posture to verify |
|---|---|---|
| [Streamatico/PolymarketViewer](https://github.com/Streamatico/PolymarketViewer) | native Compose discovery, charts, watchlist, comments, profiles, Glance widgets | behavioral/architecture reference only unless a valid license is added; clean-room reimplementation |
| [Syavaman/PolymarketAlerts](https://github.com/Syavaman/PolymarketAlerts) | large-trade alerts, wallet profiles, watchlists, Telegram/push, rule settings | behavioral reference only unless a valid license is added; clean-room reimplementation |
| [al1enjesus/polymarket-whales](https://github.com/al1enjesus/polymarket-whales) | threshold detection, deduplication, Telegram/Discord, export | MIT candidate for selective port after provenance, dependency, and security review; reject geoblock-bypass behavior |
| [mailtolemos/polymarket-whale-tracker](https://github.com/mailtolemos/polymarket-whale-tracker) | momentum, wallet clustering, timing and unusual-activity heuristics | behavioral reference only until an actual license file is verified; never copy “insider” accusations |
| [structbuild/polymarket-explorer](https://github.com/structbuild/polymarket-explorer) | trader profiles, PnL, holders, comparison, global analytics | clean-room product reference unless license and third-party SDK terms are independently verified |
| [mailcrypto23/polymarket-daily-dashboard](https://github.com/mailcrypto23/polymarket-daily-dashboard) | liquidity heatmap, spread/depth imbalance, journaling, resolution analytics | product/research reference; validate every model and license before reuse |
| [pmxt-dev/pmxt](https://github.com/pmxt-dev/pmxt) | future multi-venue normalization and adapter patterns | MIT reference for post-V1 only; do not add unnecessary V1 dependency |
| [YichengYang-Ethan/oracle3](https://github.com/YichengYang-Ethan/oracle3) | research-grade cross-market constraints and discrepancy scanning | Apache-2.0 research reference for Phase 8; no autonomous execution in V1 |
| [aarora4/Awesome-Prediction-Market-Tools](https://github.com/aarora4/Awesome-Prediction-Market-Tools) | discovery index for alerts, analytics, dashboards, arbitrage, and portfolio tools | discovery aid only; independently verify every linked repository |
| [Serj8772/polymarket-cabinet](https://github.com/Serj8772/polymarket-cabinet) | portfolio/trading workflow reference | behavioral reference only; explicitly reject server-side raw private-key custody |

For every candidate, pin and record:

- repository URL and immutable commit SHA;
- actual root or package-level license file path and hash;
- copyright holders, NOTICE requirements, modification markings, and attribution;
- dependency and transitive-license inventory;
- repository activity, security posture, tests, and maintenance risk;
- components considered and exact chosen adoption mode;
- upgrade, divergence, and vulnerability-response strategy.

Allowed adoption modes are:

1. `official_dependency`;
2. `vendor_or_fork`;
3. `selective_port`;
4. `clean_room_reimplementation`;
5. `behavioral_reference_only`;
6. `reject`.

Create `OPEN_SOURCE_REFERENCE_AUDIT.md` and `open-source-provenance.yaml`. A missing or ambiguous license means **no source-code copying**: use only independently documented behavior and a clean-room implementation. Do not clone third-party code into the product tree until this gate passes. Preserve MIT/Apache notices and Apache NOTICE/modified-file obligations where applicable. Never copy trademarks, logos, prose, screenshots, data, or UI assets.

The audit must explicitly reject or isolate:

- VPN, proxy, relay, or other geoblock-bypass instructions;
- server-side storage of raw user private keys or seed phrases;
- autonomous copy trading or silent order submission in V1;
- unsupported claims that a wallet is an “insider”;
- scraping that violates terms or bypasses official limits;
- a new Python service merely because a reference repo uses Python when the existing backend can own the bounded context.

## 2.4 Mandatory Android research

Verify current official guidance for:

- Jetpack Compose app architecture and state management;
- Android modularization;
- supported API/target SDK levels;
- secure key/token storage and Android Keystore;
- network security configuration;
- app links/deep links;
- background work and push notifications;
- biometric authorization limitations;
- Play Integrity, app signing, and supply-chain controls;
- Google Play financial-features declaration;
- current blockchain/crypto exchange/wallet policies;
- country-specific distribution restrictions;
- payment-policy treatment of financial transactions and any premium digital subscription.

## 2.5 Evidence register

Create `docs/markets-v1/research/EVIDENCE_REGISTER.md` and a machine-readable
`docs/markets-v1/research/evidence-register.yaml`.

Each record must contain:

```yaml
id: EVIDENCE-001
topic: clob-v2-order-schema
claim: ""
source_url: ""
retrieved_at: YYYY-MM-DD
source_type: official-docs | official-code | verified-contract | audit | policy
version_or_commit: ""
confidence: verified | partially_verified | unverified
implementation_consequence: ""
revalidate_when: ""
owner: ""
```

Do not paste secrets, full signed messages, or inaccessible private URLs.

---

# 3. Repository discovery before target design

Inspect the existing monorepo before recommending structure.

Read completely:

- root `README*`;
- `AGENTS.md` and nested agent instructions;
- `.AllTechstack.md` or equivalent;
- package/workspace manifests;
- Turbo/Nx/pnpm/yarn/npm/Gradle configuration;
- Go modules and backend command layout;
- current frontend applications;
- existing contract packages and ABIs;
- schemas/OpenAPI/event definitions;
- migrations and sqlc/ORM configuration;
- Docker/Compose/infra configuration;
- CI workflows;
- deployment and runbook documents;
- environment examples;
- current tests and quality gates.

Use `rg`/`rg --files` first for repository discovery. Preserve user changes and do not assume a clean worktree.

Create `docs/markets-v1/architecture/EXISTING_REPOSITORY_AUDIT.md` containing:

- current repository map;
- actual technology inventory with versions;
- deployment units;
- existing reusable components;
- components requiring modification;
- components that must remain isolated;
- obsolete/legacy components;
- architectural debt;
- security and CI gaps;
- a reuse/extend/replace/deprecate decision table;
- evidence paths for every repository claim.

Do not recommend a greenfield stack simply because it is familiar. Prefer the existing stack when it is safe and maintainable. If the repository is absent or incomplete, state that clearly and provide a provisional architecture with explicit assumptions.

## 3.1 Reference-to-RetroPick architecture path

Do not create a “Frankenstein” monorepo containing several cloned applications and duplicated pollers. Extract behaviors and, only where licensing permits, selectively port bounded code behind RetroPick-owned interfaces.

| Reference behavior | RetroPick destination | Integration rule |
|---|---|---|
| Viewer discovery/search/watchlist/detail | `apps/android-markets/feature/{discovery,watchlist,marketdetail}` plus shared catalog API | clean-room Compose implementation using RetroPick design system and canonical schemas |
| Viewer charts and widgets | `core/charts`, `feature/widgets`, backend history endpoints | shared chart semantics; Glance is display-only and privacy-aware |
| Alert repo polling/detection | backend `intelligence-ingest` and `signal-engine` | one server-side normalized stream; deterministic versioned rules; never per-device polling |
| Whale notification channels | backend `alert-rules` and `alert-delivery`, Android `feature/alerts` | shared inbox first; FCM for Android; optional destinations behind user opt-in |
| Wallet analytics and trader profiles | backend `wallet-profiler`, web/Android wallet-profile feature | source-provenance and uncertainty required; no insider labels |
| Liquidity/order-book dashboards | backend `market-health`, shared chart primitives | compute with executable depth and freshness, not screenshots or copied UI |
| Relationship/arbitrage research | `relationship-scanner` behind Phase-8 flag | read-only, cost-adjusted, non-guaranteed discrepancies |
| Multi-venue normalization | future `venue-adapter` interface | Polymarket implementation only in V1; do not add a generic dependency without ADR |

For each source component, create a migration/adoption record:

```yaml
reference_repo: ""
commit_sha: ""
source_component: ""
observed_behavior: ""
license_evidence: ""
adoption_mode: official_dependency | vendor_or_fork | selective_port | clean_room_reimplementation | behavioral_reference_only | reject
retropick_owner: ""
retropick_destination: ""
canonical_contract_or_schema: ""
security_changes: []
attribution: []
acceptance_tests: []
rejected_behaviors: []
```

“Clone” in this program means reproducing approved user capabilities inside RetroPick’s original architecture. It never means importing an entire repository without license, provenance, security, data-authority, and maintenance review.

---

# 4. Required documentation output tree

Create the following documentation/harness structure. Preserve exact ordering prefixes.

```text
docs/markets-v1/
├── README.md
├── 00_DOCUMENT_MAP.md
├── 01_EXECUTIVE_PRODUCT_SPEC.md
├── 02_SCOPE_AND_CAPABILITY_MATRIX.md
├── 03_BUSINESS_MODEL_AND_UNIT_ECONOMICS.md
├── 04_REQUIREMENTS_AND_TRACEABILITY.md
├── 05_NON_FUNCTIONAL_REQUIREMENTS.md
├── research/
│   ├── EVIDENCE_REGISTER.md
│   ├── evidence-register.yaml
│   ├── POLYMARKET_CURRENT_STATE.md
│   ├── ANDROID_AND_PLAY_CURRENT_STATE.md
│   ├── OPEN_SOURCE_REFERENCE_AUDIT.md
│   ├── open-source-provenance.yaml
│   └── OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md
├── architecture/
│   ├── EXISTING_REPOSITORY_AUDIT.md
│   ├── TARGET_MONOREPO_ARCHITECTURE.md
│   ├── SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md
│   ├── DEPLOYMENT_ARCHITECTURE.md
│   ├── FAILURE_DOMAINS_AND_DEGRADED_MODES.md
│   └── adr/
│       ├── README.md
│       ├── ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md
│       ├── ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md
│       ├── ADR-003-WALLET-AND-SIGNING-MODEL.md
│       ├── ADR-004-SHARED-WEB-ANDROID-API.md
│       ├── ADR-005-REALTIME-AND-RECONCILIATION.md
│       ├── ADR-006-ANDROID-JETPACK-COMPOSE.md
│       ├── ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md
│       ├── ADR-008-SHARED-SIGNAL-ENGINE.md
│       └── ADR-009-NO-AUTO-COPY-TRADING-V1.md
├── polymarket/
│   ├── CAPABILITY_AND_DEPENDENCY_MATRIX.md
│   ├── API_SDK_AND_ENDPOINT_REGISTRY.md
│   ├── CONTRACT_ABI_AND_ADDRESS_REGISTRY.md
│   ├── AUTHENTICATION_AND_ACCOUNT_WALLETS.md
│   ├── BUILDER_RELAYER_AND_FEES.md
│   ├── MARKET_DATA_AND_REALTIME.md
│   ├── ORDER_LIFECYCLE.md
│   ├── FUNDS_DEPOSIT_AND_WITHDRAWAL.md
│   ├── POSITIONS_CTF_AND_REDEMPTION.md
│   ├── NEGATIVE_RISK_AND_AUGMENTED_MARKETS.md
│   ├── COMBOS_CAPABILITY_GATE.md
│   └── UPSTREAM_CHANGE_MANAGEMENT.md
├── intelligence/
│   ├── TRADER_INTELLIGENCE_PRODUCT_SPEC.md
│   ├── OPEN_SOURCE_ADOPTION_MAP.md
│   ├── WHALE_AND_LARGE_TRADE_DETECTION.md
│   ├── WALLET_PROFILING_AND_SMART_MONEY.md
│   ├── MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md
│   ├── ALERT_RULES_AND_DELIVERY.md
│   ├── UNUSUAL_ACTIVITY_HEURISTICS.md
│   ├── RELATIONSHIP_AND_ARBITRAGE_SCANNER.md
│   └── SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md
├── backend/
│   ├── BACKEND_ARCHITECTURE.md
│   ├── SERVICE_AND_MODULE_BOUNDARIES.md
│   ├── DOMAIN_MODEL_AND_STATE_MACHINES.md
│   ├── DATABASE_AND_MIGRATIONS.md
│   ├── INDEXING_RECONCILIATION_AND_REORGS.md
│   ├── CACHE_QUEUE_AND_RATE_LIMITING.md
│   ├── API_AND_REALTIME_CONTRACTS.md
│   ├── AUTH_SESSION_AND_ELIGIBILITY.md
│   ├── NOTIFICATIONS.md
│   └── BACKEND_TEST_STRATEGY.md
├── web/
│   ├── WEB_PRODUCT_INFORMATION_ARCHITECTURE.md
│   ├── WEB_APPLICATION_ARCHITECTURE.md
│   ├── DESIGN_SYSTEM_AND_ACCESSIBILITY.md
│   ├── WALLET_AND_TRANSACTION_UX.md
│   ├── MARKET_AND_ORDERBOOK_UX.md
│   ├── PORTFOLIO_FUNDING_AND_REDEMPTION_UX.md
│   ├── ERROR_DEGRADED_AND_RECOVERY_UX.md
│   └── WEB_TEST_STRATEGY.md
├── android/
│   ├── ANDROID_PRODUCT_SCOPE.md
│   ├── COMPOSE_APP_ARCHITECTURE.md
│   ├── GRADLE_MODULE_GRAPH.md
│   ├── NAVIGATION_AND_DEEP_LINKS.md
│   ├── STATE_DATA_OFFLINE_AND_REALTIME.md
│   ├── WALLET_SIGNING_AND_SECURITY.md
│   ├── NOTIFICATIONS_AND_BACKGROUND_WORK.md
│   ├── ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md
│   ├── PLAY_STORE_COMPLIANCE_AND_RELEASE.md
│   └── ANDROID_TEST_STRATEGY.md
├── security/
│   ├── THREAT_MODEL.md
│   ├── ASSET_AND_DATA_CLASSIFICATION.md
│   ├── SIGNING_AND_TRANSACTION_INTEGRITY.md
│   ├── SECRETS_KEYS_AND_ACCESS_CONTROL.md
│   ├── SUPPLY_CHAIN_AND_SBOM.md
│   ├── ABUSE_FRAUD_AND_RATE_LIMITS.md
│   ├── SECURITY_TEST_AND_REVIEW_PLAN.md
│   └── INCIDENT_RESPONSE.md
├── platform/
│   ├── ENVIRONMENT_AND_CONFIGURATION.md
│   ├── INFRASTRUCTURE_AND_COST_MODEL.md
│   ├── CI_CD_PIPELINE.md
│   ├── OBSERVABILITY_SLOS_AND_ALERTS.md
│   ├── BACKUP_RESTORE_AND_DISASTER_RECOVERY.md
│   ├── RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md
│   └── PRODUCTION_OPERATIONS_RUNBOOK.md
├── testing/
│   ├── MASTER_TEST_PLAN.md
│   ├── TEST_PYRAMID_AND_ENVIRONMENTS.md
│   ├── CONTRACT_AND_CONFORMANCE_TESTS.md
│   ├── END_TO_END_CRITICAL_JOURNEYS.md
│   ├── LOAD_CHAOS_AND_RESILIENCE.md
│   └── RELEASE_VERIFICATION_MATRIX.md
├── phases/
│   ├── README.md
│   ├── PHASE-0-DISCOVERY-AND-SPEC-FREEZE.md
│   ├── PHASE-1-FOUNDATION-AND-READ-MARKETS.md
│   ├── PHASE-2-ACCOUNT-WALLET-AND-FUNDING.md
│   ├── PHASE-3-WEB-TRADING-CORE.md
│   ├── PHASE-4-PORTFOLIO-REDEMPTION-AND-WITHDRAWAL.md
│   ├── PHASE-5-ANDROID-COMPOSE-MARKETS.md
│   ├── PHASE-6-HARDENING-CI-CD-AND-SRE.md
│   ├── PHASE-7-PRODUCTION-LAUNCH.md
│   └── PHASE-8-POST-V1-ADVANCED-CAPABILITIES.md
└── agent-harness/
    ├── AGENT_OPERATING_CONTRACT.md
    ├── implementation-manifest.yaml
    ├── task-graph.yaml
    ├── REQUIREMENTS_TO_TASK_TRACEABILITY.md
    ├── PHASE_GATE_TEMPLATE.md
    ├── TASK_SPEC_TEMPLATE.md
    ├── AGENT_HANDOFF_TEMPLATE.md
    ├── VERIFICATION_EVIDENCE_TEMPLATE.md
    ├── DECISION_AND_ASSUMPTION_LOG.md
    └── BLOCKERS_AND_HUMAN_APPROVALS.md
```

If an equivalent document already exists, update or cross-link it instead of maintaining two conflicting sources of truth. Record the decision in the document map.

---

# 5. Documentation quality contract

Every architecture or implementation document must include:

1. purpose;
2. status and owner;
3. in-scope and out-of-scope;
4. prerequisites and dependencies;
5. authoritative sources;
6. current-state findings;
7. target design;
8. alternatives considered;
9. explicit decisions;
10. data and control flows;
11. failure and recovery behavior;
12. security implications;
13. observability;
14. test strategy;
15. rollout and rollback;
16. unresolved decisions;
17. acceptance criteria;
18. links to upstream and downstream documents.

Use:

- Mermaid for system context, trust boundaries, state machines, and important sequences;
- tables for capability, ownership, failure, environment, and traceability mappings;
- fixed-point examples for money/price/quantity;
- named state transitions rather than vague prose;
- concrete file paths when the repository exists;
- `MUST`, `SHOULD`, and `MAY` consistently.

Do not:

- state speculation as fact;
- use floating point for financial values;
- put real secrets or complete credentials into docs;
- invent contract addresses;
- use “handle error” as a complete failure design;
- leave critical decisions hidden in narrative text;
- mark a phase complete without evidence.

---

# 6. Capability matrix

`02_SCOPE_AND_CAPABILITY_MATRIX.md` must map every capability across:

- Polymarket upstream support;
- Markets backend;
- web;
- Android V1;
- Android later;
- on-chain interaction;
- user signature required;
- relayer eligibility;
- legal/policy gate;
- degraded behavior;
- V1 phase;
- test coverage;
- launch status.

Minimum rows:

- public event feed;
- search/categories/trending;
- event detail;
- market rules and resolution source;
- standard binary market;
- multi-outcome event;
- augmented Negative Risk placeholder handling;
- order-book snapshot;
- order-book stream;
- price history;
- public trades;
- wallet connect;
- sign-in/session;
- account-wallet discovery;
- Deposit Wallet creation;
- trading approvals;
- pUSD balance;
- funding/deposit;
- collateral wrap/onramp;
- bridge;
- withdrawal/transfer;
- limit buy;
- limit sell;
- marketable buy with spend cap;
- marketable sell;
- post-only;
- FOK/FAK/GTD/GTC where supported;
- order preview;
- EIP-712 signing;
- Builder attribution;
- Builder fee disclosure;
- submit single order;
- submit batch orders;
- partial fills;
- cancel one;
- cancel all;
- matching-engine restart recovery;
- authenticated order stream;
- activity;
- open orders;
- fills;
- positions;
- cost basis/PnL;
- split;
- merge;
- redeem;
- Negative Risk convert;
- resolved/claimable state;
- notifications;
- watchlist;
- market and wallet watchlists;
- configurable alert rules;
- price-cross and probability-move alerts;
- volume, volatility, liquidity-drop, spread, and depth alerts;
- new-market and market-rule-change alerts;
- cutoff, resolution, redemption, and claimable alerts;
- own order, fill, position, funding, and withdrawal alerts;
- large-trade and watched-wallet alerts;
- whale activity feed and wallet profile;
- market health and executable-depth score;
- resolution-source health, rule-version hash/diff, cutoff calendar, and metadata-completeness risk;
- order-book heatmap and estimated price impact;
- pre-trade payoff, break-even, fee, slippage, max-loss, and position-size simulator;
- portfolio exposure and execution-quality analytics;
- trade journal;
- Android home-screen widgets;
- unusual-activity heuristics;
- cross-market relationship/discrepancy scanner;
- geoblock;
- unsupported region;
- Combos;
- outage/read-only mode.

For every `not supported` item, state whether it is an upstream limitation, product decision, policy restriction, or future work.

---

# 6A. Trader intelligence, analytics, and alerts

RetroPick Markets must improve the trader’s decision and monitoring workflow without pretending to guarantee returns, identify insiders, or execute trades without explicit authorization.

## 6A.1 Locked V1 feature set

Design these as shared backend capabilities consumed by web and Android:

1. watchlists for markets, events, wallets, tags, and categories;
2. configurable rules for:
   - price/probability crossing;
   - absolute and log-odds movement;
   - volume or trade-count spike;
   - spread widening, executable-depth loss, liquidity shock, and order-book imbalance;
   - newly listed market and material rule/metadata change;
   - cutoff, resolution, redemption, and claimable state;
   - large trade, whale activity, watched-wallet activity, and consensus change;
   - the user’s own order, fill, cancellation, position, funding, withdrawal, and reconciliation state;
3. one normalized signal inbox with Android push and in-app delivery;
4. deduplication, cooldown, quiet hours, snooze, severity, expiry, escalation, delivery receipt, and deep link to evidence;
5. a whale/large-trade feed with configurable absolute, market-relative, book-relative, and wallet-relative thresholds;
6. wallet profiles showing resolved-sample performance, volume, concentration, category specialization, timing, and uncertainty;
7. market intelligence showing large-trade timeline, net flow/consensus, volatility, spread, executable depth, estimated slippage, order-book heatmap, and market-health score;
8. a resolution-integrity panel showing rule provenance, immutable rule-version hash, exact diffs when metadata/rules change, resolution source health, cutoff/catalyst calendar, and deterministic metadata-completeness warnings;
9. a pre-trade scenario simulator for payout, break-even probability, fee, estimated slippage, price impact, maximum loss, and position size—always recomputed from a fresh executable preview before signing;
10. portfolio exposure by event/category/resolution time, realized/unrealized PnL provenance, claimable assets, execution quality, export, and trade journal;
11. Android Glance widgets for selected public markets/watchlists and opt-in private position summaries, with lock-screen/privacy controls.

The system must ingest each upstream event once, compute deterministic/versioned signals once, and fan them out against indexed user rules. Do not create a polling loop per user or per alert.

## 6A.2 Feature-gated V1.1

- unusual-activity **risk heuristics**: new-wallet large position, velocity burst, correlated wallet timing, concentration, and near-resolution activity;
- trader leaderboard/profile and clearly explained archetype;
- related-market and dependency graph;
- Telegram, Discord, email, and authenticated webhook destinations;
- evidence/news context that cites sources and separates facts from interpretation;
- read-only cross-market discrepancy scanner.

Never state or imply that an address is an insider. Use neutral labels such as `unusual_activity`, show the contributing observations, data freshness, score version, confidence/uncertainty, and false-positive warning.

## 6A.3 Post-V1 research

- PMXT-style multi-venue adapters;
- constraint classes for equivalence, mutual exclusivity, implication, partition sum, conditional bounds, and lead/lag;
- AI-assisted research summaries;
- manual copy-intent that opens a fresh, fully previewed order for explicit user signing;
- autonomous or automatic copy trading only as a separate product with a new custody, legal, risk, security, and human-approval review.

## 6A.4 Quantitative specification

Use raw trades and executable order books, not vague “AI scores.” At minimum specify:

```text
absolute_notional = price × size
book_consumption  = absolute_notional / executable_depth_within_bps
wallet_share      = absolute_notional / max(recent_wallet_notional, epsilon)
log_odds_move     = logit(clamp(p_now)) - logit(clamp(p_previous))
```

Large-trade classification must combine absolute notional, empirical market percentile, book consumption, wallet-relative size, time to resolution, position concentration, and freshness. Heavy-tailed features must use empirical quantiles or robust median/MAD normalization rather than fragile mean/standard-deviation thresholds.

Define a deterministic, versioned `WhaleScore`:

```text
WhaleScore = 100 × weighted_sum(normalized_components)
```

Publish every component, weight version, cutoff, and reason code. Backtest alert precision, rate, delay, retraction rate, and downstream outcome by market regime. A score is descriptive evidence, not a recommendation.

Wallet “smart-money” performance must have:

- minimum resolved sample and minimum active-history requirements;
- separation of realized results from mark-to-market estimates;
- category and time-window segmentation;
- Bayesian/Beta-Binomial shrinkage for binary resolved outcomes:

```text
posterior_mean = (alpha0 + wins) / (alpha0 + beta0 + resolved_count)
```

- a posterior interval or equivalent uncertainty measure;
- calibration and survivorship-bias analysis;
- no ranking based solely on raw win rate.

Market-health and liquidity models must disclose units and weights. They must include spread, executable depth at configured basis-point bands, price impact at representative notionals, depth imbalance, freshness, volatility, and stale/crossed-book flags.

A discrepancy is not “arbitrage” unless expected profit is positive after executable bid/ask, available depth, venue/order fees, gas, bridge cost, slippage, latency, fill probability, and non-atomic leg risk. Otherwise label it `theoretical_discrepancy`.

AI may summarize or narrate deterministic evidence. It may not classify a trade, invent a number, calculate an undisclosed score, accuse a wallet, or silently cause an order.

## 6A.5 Signal integrity

Each signal needs:

- immutable evidence references to trade, book snapshot, market, wallet, and source timestamp;
- observed-at, processed-at, delivered-at, and expired-at timestamps;
- algorithm/weight version and feature values;
- data freshness, confidence/uncertainty, and reason codes;
- lifecycle `observed → confirmed → delivered → expired`, plus `retracted` for reorgs or upstream corrections;
- correction/retraction notifications and audit trail;
- idempotency key, deduplication key, and reproducible test fixture.

Define latency and completeness SLOs per signal class. User-facing copy must distinguish upstream data, derived metric, heuristic, and opinion.

## 6A.6 Packaging, retention, and business guardrails

Design a feature registry that records user value, data cost, notification urgency, V1 tier, platform parity, legal risk, abuse risk, and success metric. At minimum evaluate:

- free core: market discovery, limited watchlists, essential own-account/order/resolution alerts, rules provenance, and safe pre-trade preview;
- optional paid/pro tier after validation: higher watchlist/rule limits, longer signal history, advanced wallet/liquidity analytics, exports, webhook/API access, and cross-market research;
- team/API tier after V1: shared watchlists, programmatic signal delivery, and governed higher-rate access.

Never paywall security-critical order/funding state, material rule changes, unsupported-region status, or claimable/redemption notices. Do not sell preferential execution, hidden wallet labels, or unexplainable scores. Model per-active-user notification and retention cost, opt-out rate, false-positive rate, alert-to-market-view conversion, preview-to-authorized-order conversion, and 30-day retained watchlist users.

---

# 7. Business and product specification

`01_EXECUTIVE_PRODUCT_SPEC.md` and `03_BUSINESS_MODEL_AND_UNIT_ECONOMICS.md` must define:

- product one-liner;
- problem and differentiated value;
- user segments and jobs to be done;
- web versus Android roles;
- functional-parity boundary;
- explicit non-goals;
- acquisition and retention loops;
- Builder Program positioning;
- transparent fee policy;
- possible later subscription/API revenue;
- unit-economics formula;
- cost model;
- KPI tree;
- North Star metric;
- guardrail metrics;
- launch and kill criteria;
- risks of upstream dependency;
- trademark and UX-originality boundary.

Collateral and user balances are liabilities/user assets, not revenue.

Model at least:

```text
builder fee revenue
+ subscription/API revenue
- relayer/gas subsidy
- upstream/provider costs
- infrastructure
- support/fraud losses
= contribution margin
```

Do not use unsupported market-size numbers. If market sizing is included, show source, date, methodology, and uncertainty.

---

# 8. Polymarket integration specification

## 8.1 API/SDK registry

Document each external interface with:

- purpose;
- base URL;
- authentication;
- request/response schemas;
- pagination;
- rate limits;
- ordering and sequence semantics;
- idempotency;
- retry policy;
- timeout;
- error taxonomy;
- sensitive fields;
- cache policy;
- health probe;
- fallback/degraded behavior;
- SDK/API version;
- owner;
- revalidation date.

The backend must shield web and Android from upstream schema churn through a versioned anti-corruption layer.

## 8.2 Contract and ABI registry

Never place a remembered address directly in business logic.

The registry document and future configuration design must include:

```yaml
network: polygon
chain_id: 137
environment: production
component: ctf_exchange_v2
address: "<verified-at-implementation-time>"
source_url: ""
code_hash: ""
proxy_type: none | transparent | uups | beacon | unknown
implementation_address: ""
admin_or_owner: ""
abi_source: ""
verified_at: YYYY-MM-DD
status: active | deprecated | test_only
```

Require startup verification of:

- chain ID;
- non-empty bytecode;
- expected code hash or verified implementation;
- EIP-712 domain;
- configured collateral;
- exchange selection for standard versus Negative Risk markets.

Specify how emergency upstream contract changes are detected, reviewed, canaried, and rolled back.

## 8.3 Authentication and wallets

Produce separate flows for every actually supported account model:

- signer EOA;
- account wallet;
- Deposit Wallet;
- Safe/proxy wallet;
- direct EOA if supported/allowlisted;
- embedded/delegated wallet only if selected.

For each, show:

- address ownership;
- where assets reside;
- which address the CLOB treats as wallet/maker;
- who signs L1 auth;
- how L2 credentials are derived/stored/rotated;
- who signs orders;
- who signs relayer batches;
- approvals;
- gas payer;
- recovery;
- logout/revoke;
- migration;
- mobile limitations.

Never collapse signer address and account-wallet address into one field.

## 8.4 Funds, deposit, and withdrawal

`FUNDS_DEPOSIT_AND_WITHDRAWAL.md` must be implementation-grade.

Research and document the current supported flows rather than assuming legacy USDC.e behavior.

At minimum include:

- starting assets and supported source networks/providers;
- destination account wallet;
- pUSD role;
- collateral onramp/wrap;
- bridge and provider boundaries;
- deposits initiated through Polymarket versus RetroPick;
- direct wallet transfer;
- approvals;
- confirmations/finality;
- minimum/maximum and fees;
- withdrawal/unwrap/bridge/transfer destination;
- user cancellation possibilities;
- stuck, delayed, wrong-chain, wrong-token, and underfunded flows;
- reconciliation sources;
- support/incident escalation;
- UI state machine;
- notification events;
- legal/provider gates.

Distinguish:

1. funding a wallet;
2. wrapping into trading collateral;
3. moving collateral into an account wallet;
4. approving exchange spend;
5. closing positions;
6. redeeming resolved claims;
7. transferring or withdrawing collateral.

Do not call a simple token transfer a completed withdrawal if additional unwrap or bridge steps remain.

## 8.5 Order lifecycle

Specify canonical states and transitions for:

```text
editing
previewing
ready_to_sign
wallet_pending
signed
submitting
accepted
open
partially_filled
filled
cancel_pending
cancelled
expired
rejected
unknown_reconciling
chain_settlement_pending
settled
```

Include:

- local correlation ID;
- idempotency key;
- signed-payload hash;
- upstream order ID;
- client order ID if supported;
- on-chain transaction/fill identifiers;
- causal ordering;
- reorg/reconciliation policy;
- matching-engine restart behavior;
- retry decision table.

An HTTP timeout after submission must enter `unknown_reconciling`, not automatically become `failed`.

## 8.6 Positions and resolution

Document:

- outcome token identity;
- balance and position source;
- cost-basis methodology;
- realized/unrealized/claimable semantics;
- complete sets;
- split and merge;
- standard and Negative Risk conversions;
- augmented market placeholder handling;
- market resolved versus redeemable versus redeemed;
- invalid/cancelled market behavior;
- finality and reorg handling;
- rounding and fixed-point rules.

Do not infer Negative Risk status from titles. Use official metadata and contract selection.

---

# 9. Backend architecture

Inspect the existing backend before selecting languages or frameworks. If the monorepo already uses Go, PostgreSQL/sqlc, process-per-command workers, or other stable patterns, evaluate and reuse them unless evidence justifies replacement.

Specify bounded contexts:

- market catalog;
- market-data ingest;
- public query;
- order preview/orchestration;
- account and wallet metadata;
- portfolio/activity projection;
- chain indexer;
- reconciliation;
- funding/withdrawal tracking;
- eligibility/policy;
- notifications;
- intelligence ingest and feature extraction;
- deterministic signal engine;
- wallet profiler;
- alert rules and delivery;
- market-health analytics;
- relationship/discrepancy scanner;
- administration/operations.

Prefer modules/processes in the existing backend—such as `intelligence-ingest`, `signal-engine`, `wallet-profiler`, `alert-rules`, `alert-delivery`, `market-health`, and `relationship-scanner`—over importing each reference repository as a separate service. A Python/ML service requires an ADR proving that a validated model or library cannot be operated safely in the existing stack. Keep inference off the synchronous order path.

For every module/process define:

- responsibility;
- owned tables;
- consumed and emitted events;
- upstream dependencies;
- credentials;
- scaling unit;
- failure isolation;
- SLO;
- retry/DLQ behavior;
- idempotency;
- deployment unit;
- owner.

## 9.1 Data model

Produce an ER diagram and table-level specification including:

- keys;
- uniqueness;
- immutable upstream identifiers;
- decimal/base-unit types;
- statuses;
- versioning;
- timestamps;
- provenance;
- retention;
- PII/security classification;
- indices and expected access paths;
- migration strategy.

Minimum domains:

```text
platform.*
markets.catalog_*
markets.market_data_*
markets.orders
markets.order_attempts
markets.fills
markets.wallet_accounts
markets.funding_operations
markets.withdrawal_operations
markets.position_projections
markets.redemption_projections
markets.chain_events
markets.reconciliation_runs
markets.builder_fee_versions
markets.eligibility_decisions
markets.notifications
markets.watchlists
markets.watchlist_items
markets.wallet_profiles
markets.wallet_performance_snapshots
markets.wallet_labels
markets.large_trade_signals
markets.market_signals
markets.market_health_snapshots
markets.alert_rules
markets.alert_deliveries
markets.signal_evidence
markets.signal_retractions
markets.market_relationships
markets.execution_quality
markets.trade_journal_entries
markets.sync_checkpoints
markets.raw_upstream_events
```

The database is a projection and operational record, not the authority for on-chain ownership.

## 9.2 API contracts

Define OpenAPI and async/realtime contracts shared by web and Android.

At minimum specify:

```text
GET  /v1/eligibility
GET  /v1/capabilities
GET  /v1/markets/events
GET  /v1/markets/events/{id}
GET  /v1/markets/markets/{id}
GET  /v1/markets/markets/{id}/orderbook
GET  /v1/markets/markets/{id}/history
GET  /v1/markets/me/wallets
GET  /v1/markets/me/balances
GET  /v1/markets/me/orders
GET  /v1/markets/me/activity
GET  /v1/markets/me/positions
POST /v1/markets/account-wallet/preview
POST /v1/markets/account-wallet/relay
POST /v1/markets/approvals/preview
POST /v1/markets/approvals/relay
POST /v1/markets/funding/quote
POST /v1/markets/funding/track
POST /v1/markets/withdrawals/preview
POST /v1/markets/withdrawals/submit
POST /v1/markets/orders/preview
POST /v1/markets/orders/submit
POST /v1/markets/orders/{id}/cancel-preview
POST /v1/markets/orders/{id}/cancel
POST /v1/markets/positions/operation-preview
POST /v1/markets/positions/operation-relay
GET  /v1/markets/watchlists
POST /v1/markets/watchlists
GET  /v1/markets/intelligence/signals
GET  /v1/markets/intelligence/whales
GET  /v1/markets/intelligence/wallets/{address}
GET  /v1/markets/markets/{id}/health
GET  /v1/markets/markets/{id}/flow
GET  /v1/markets/alerts/rules
POST /v1/markets/alerts/rules
GET  /v1/markets/alerts/inbox
GET  /v1/markets/me/execution-quality
GET  /v1/markets/me/journal
POST /v1/markets/me/journal
```

These paths are a design baseline, not assumed upstream endpoints. Confirm which belong in RetroPick and which are unnecessary.

Every endpoint specification must include:

- auth;
- eligibility;
- request/response schema;
- money units;
- idempotency;
- error model;
- rate limit;
- timeout;
- audit event;
- metrics;
- examples;
- compatibility policy.

Generate future TypeScript and Kotlin transport clients from canonical schemas. Do not make Android import TypeScript packages.

Specify one shared event path:

```text
official Polymarket sources
→ normalized immutable event
→ feature extraction
→ deterministic signal and evidence
→ indexed rule matching
→ inbox/push/webhook fan-out
→ delivery receipt, expiry, or retraction
```

The path must be replayable from checkpoints, tolerate duplicates/out-of-order events, handle reorgs/upstream corrections, and degrade independently from trading. Failing intelligence features must never corrupt order, balance, or position authority.

---

# 10. Web frontend specification

Inspect and retain the existing web framework where reasonable.

Document:

- route and information architecture;
- server/client rendering decisions;
- state ownership;
- wallet connection;
- session and authentication;
- query/cache strategy;
- real-time order-book and user updates;
- financial decimal types;
- error boundaries;
- accessibility;
- responsive behavior;
- SEO for public market pages;
- analytics with sensitive-field redaction;
- feature flags;
- security headers and CSP;
- original RetroPick design system.

Required journey specifications:

1. first visit and eligibility;
2. discovery and search;
3. market/rules review;
4. wallet connect/account-wallet detection;
5. funding/deposit;
6. approvals;
7. order preview/sign/submit;
8. partial fills/cancel;
9. portfolio/activity;
10. market resolution;
11. redeem;
12. withdraw;
13. wrong chain/token;
14. stale order book;
15. upstream outage;
16. unsupported region;
17. relayer unavailable;
18. unknown transaction/order state.

Each journey must have screen states, data dependencies, loading/empty/error/degraded states, sensitive confirmations, analytics, accessibility, and acceptance tests.

---

# 11. Android Jetpack Compose specification

Android V1 is Markets only.

Define a multi-module Gradle project under the monorepo. Use a structure derived from actual needs, such as:

```text
apps/android-markets/
├── app/
├── build-logic/
├── core/
│   ├── common/
│   ├── model/
│   ├── designsystem/
│   ├── navigation/
│   ├── network/
│   ├── database/
│   ├── security/
│   ├── wallet/
│   ├── realtime/
│   ├── analytics/
│   ├── charts/
│   ├── notifications/
│   └── testing/
├── data/
│   ├── catalog/
│   ├── trading/
│   ├── portfolio/
│   ├── funding/
│   ├── identity/
│   ├── notifications/
│   └── intelligence/
├── domain/
└── feature/
    ├── eligibility/
    ├── discovery/
    ├── marketdetail/
    ├── wallet/
    ├── funding/
    ├── orderticket/
    ├── orders/
    ├── portfolio/
    ├── redemption/
    ├── withdrawal/
    ├── watchlist/
    ├── widgets/
    ├── alerts/
    ├── walletprofile/
    ├── intelligence/
    └── settings/
```

Use `Streamatico/PolymarketViewer` only as a behavior and architecture case study until its license is proven. Recreate its valuable concepts—Compose discovery, charts, watchlists, profiles, comments where officially supported, WorkManager refresh, and Glance widgets—inside RetroPick’s multi-module boundaries. Do not transplant its single application module, package names, UI copy, brand, layouts, or assets.

Map shared trader-intelligence behavior into the modules above:

- `feature:alerts` owns rule editing and signal inbox UI;
- `feature:walletprofile` explains wallet observations and uncertainty;
- `feature:intelligence` presents large trades, market health, flow, and related markets;
- `feature:widgets` provides privacy-aware Glance surfaces;
- `core:notifications` owns FCM token registration, channels, deep links, and delivery state;
- `core:charts` owns deterministic price, depth, flow, and PnL visualization primitives;
- backend APIs remain the authority for shared signal calculation and rule matching.

Document and justify:

- module dependency graph;
- Compose navigation;
- immutable `UiState`;
- user intents/events;
- ViewModel/state-holder boundaries;
- repository/use-case boundaries;
- Room/local cache;
- DataStore preferences;
- REST and realtime clients;
- serialization;
- generated OpenAPI client;
- decimal/base-unit representation;
- process death and state restoration;
- offline/read-only behavior;
- background reconciliation;
- push notifications;
- notification permission, channel, quiet-hour, deduplication, expiry, and retraction behavior;
- Glance widget privacy, freshness, update budget, and signed-out behavior;
- deep links/app links;
- wallet handoff and resume;
- biometrics;
- Keystore use;
- Play Integrity;
- certificate/network policy;
- screenshot/overlay policy;
- analytics privacy;
- performance and baseline profiles;
- accessibility and adaptive layouts.

Android must not submit a new order using only stale cached data. Fresh eligibility, capability, fee, market, balance/allowance, and order preview are required.

If no official Polymarket Kotlin SDK exists or it lacks required capabilities, do not port cryptographic logic casually. Design a stable RetroPick API plus a reviewed local signing/wallet-coordinator boundary. Explicitly identify which payload fields Android verifies before wallet authorization.

Produce parity tables:

- web versus Android V1;
- direct API versus backend-mediated;
- foreground versus background;
- online versus cached;
- available versus policy-gated.

---

# 12. Security specification

Create a threat model using assets, actors, entry points, trust boundaries, attack trees/STRIDE, mitigations, residual risk, and verification.

At minimum cover:

- stolen Builder credentials;
- compromised backend;
- malicious or compromised Android device;
- frontend supply-chain compromise;
- order-payload tampering;
- wrong EIP-712 domain/contract;
- signature replay;
- signer/account-wallet confusion;
- relayer drain;
- excessive allowances;
- approval phishing;
- fake token/contract/address configuration;
- malicious market metadata;
- stale/corrupt order book;
- fake deposit/withdrawal status;
- bridge/provider failure;
- webhook/realtime spoofing;
- reorg and duplicate chain events;
- database projection divergence;
- session/account takeover;
- geoblock bypass;
- PII/telemetry leakage;
- notification/deep-link injection;
- fabricated, duplicated, delayed, or unretracted intelligence signals;
- alert-rule enumeration, notification spam, and delivery-channel abuse;
- wallet stalking, deanonymization, and harmful labeling;
- poisoned historical data or manipulated order-book features;
- model/weight drift and unreviewed score changes;
- AI hallucination presented as deterministic evidence;
- compromised CI/release keys;
- malicious dependency;
- admin/operations abuse.

Required controls:

- least privilege;
- separate environment credentials;
- HSM/secret manager for server secrets;
- no user private keys;
- exact-payload signing;
- idempotency and nonces;
- allowlisted contracts/functions;
- code-hash and chain verification;
- transaction simulation where supported;
- relayer budgets and kill switches;
- short-lived sessions;
- audit logs;
- immutable signal evidence, versioned rules, replay tests, and retraction controls;
- wallet-label moderation, neutral terminology, privacy review, and abuse reporting;
- strict separation between intelligence output and order authorization;
- SBOM and provenance;
- dependency pinning;
- branch protection and review;
- release signing;
- incident and credential-rotation runbooks.

Classify every action as:

- read only;
- off-chain signed order;
- user-paid on-chain transaction;
- gasless relayed on-chain transaction;
- privileged Builder action;
- internal administrative action.

---

# 13. Testing and verification

Build a master verification strategy spanning:

- unit;
- property/invariant;
- schema;
- API contract;
- SDK conformance;
- wallet/signing test vectors;
- contract integration;
- fork/simulation;
- database migration;
- indexer/reorg;
- reconciliation;
- signal golden vectors, deterministic replay, correction, expiry, and retraction;
- robust-statistics and Bayesian-score property tests;
- historical backtest with temporal splits, calibration, false-positive, survivorship-bias, and regime analysis;
- alert rule-matching, deduplication, cooldown, quiet-hour, fan-out, and delivery-contract tests;
- adversarial wallet-label and unusual-activity test cases;
- web component/integration;
- Compose unit/UI/screenshot;
- accessibility;
- end-to-end;
- load;
- chaos/fault injection;
- security;
- release smoke;
- production synthetic/read-only probes.

Golden vectors must cover:

- money conversions and rounding;
- standard versus Negative Risk exchange selection;
- EIP-712 domain and order serialization;
- Builder metadata;
- signer/account-wallet pairs;
- order states and partial fills;
- pUSD balances and approvals;
- split/merge/redeem;
- Negative Risk conversion;
- deposit/withdraw state transitions;
- idempotent retries;
- upstream errors.

No test may require exposing a real user private key.

Define evidence required for each gate:

- command;
- environment;
- test data;
- result;
- artifact/log;
- timestamp;
- commit;
- reviewer.

---

# 14. CI/CD and production engineering

Design CI/CD for the actual monorepo.

## 14.1 Pull-request gates

Include as applicable:

- formatting/lint;
- type checks;
- Go/static analysis;
- Gradle/Kotlin/Compose checks;
- unit and contract tests;
- OpenAPI/JSON Schema validation;
- generated-client drift;
- database migration and sqlc/ORM drift;
- ABI/address-registry validation;
- dependency/license/security scan;
- secret scan;
- SBOM;
- Android lint and tests;
- web build;
- backend build;
- container build;
- infrastructure validation;
- documentation link/traceability validation.

## 14.2 Build artifacts

Specify immutable versioning and provenance for:

- backend binaries/images;
- web build/deployment;
- Android AAB/APK;
- schemas/generated clients;
- database migrations;
- contract ABI/address registry;
- documentation/harness manifest.

## 14.3 Environments

Define:

- local;
- deterministic integration;
- staging;
- production;
- Android internal/closed/production tracks.

Do not assume a reliable Polymarket testnet. If current official test infrastructure is absent or incomplete, specify fixtures, mocked CLOB behavior, local contract simulation, isolated production smoke wallets, strict notional caps, and human approval.

## 14.4 Deployment

Document:

- independent deployability of web, backend processes, and Android;
- backward-compatible API/schema rollout;
- expand/migrate/contract database changes;
- feature flags;
- canary;
- migration gates;
- smoke tests;
- rollback;
- forward-fix conditions;
- minimum supported mobile version;
- emergency remote configuration;
- order-submission kill switch;
- read-only mode.

## 14.5 SRE

Define SLIs/SLOs for:

- catalog freshness;
- order-book freshness;
- order-preview latency;
- order-submit availability;
- order-state reconciliation;
- position consistency;
- deposit/withdrawal tracking;
- notification delay;
- Android crash-free users and ANR;
- web availability;
- upstream dependency health.

For each alert define symptom, threshold, severity, owner, dashboard, immediate action, user impact, and runbook.

---

# 15. Phase plan

The implementation program must use these exact phase IDs and names unless repository evidence requires a documented ADR to change them.

## PHASE-0 — Discovery and Spec Freeze

Goal: eliminate unknowns that can invalidate signing, custody, deployment, or product scope.

Deliverables:

- repository audit;
- evidence register;
- capability matrix;
- current contract/API/SDK registry;
- open-source reference, license, provenance, and adoption-mode audit;
- locked V1/V1.1/post-V1 trader-intelligence feature registry;
- signal definitions, equations, thresholds, reason codes, and evaluation plan;
- ADR set;
- product and non-functional requirements;
- traceability baseline;
- initial threat model;
- cost baseline.

Exit gate:

- no unverified production contract address;
- no unresolved signer/account-wallet ambiguity;
- no unresolved collateral assumption;
- no unclear Android stack decision;
- no third-party code approved without an unambiguous license and security review;
- no unresolved claim about AI, whale, smart-money, insider, or arbitrage semantics;
- human approval of V1 scope.

## PHASE-1 — Foundation and Read Markets

`phase1_name` is:

> **Foundation and Read Markets**

Goal: establish monorepo boundaries, schemas, environment/configuration, public catalog, market detail, order-book/history, web read experience, and Android read foundation without trading.

Required planning detail:

- target directories;
- exact packages/modules;
- public data ingest;
- canonical schemas;
- database migrations;
- caching;
- realtime snapshot/gap recovery;
- web routes;
- Compose modules/screens;
- watchlist storage, basic price/new-market/rule-change alerts, and public market widgets;
- shared signal schema, evidence envelope, rule model, and alert inbox foundation;
- observability;
- fixtures;
- CI;
- acceptance tests;
- rollback.

Exit gate:

- web and Android render the same canonical market;
- rules and source provenance are visible;
- stale/offline states are explicit;
- schema conformance and freshness SLOs pass;
- no user signing or fund movement exists yet;
- every signal can be reproduced from its evidence and corrected/retracted.

## PHASE-2 — Account Wallet and Funding

Goal: eligibility, session/auth, wallet connection, account-wallet discovery/deployment, approvals, balances, funding/deposit, and withdrawal design foundations.

Also add watched-wallet and user-owned funding/withdrawal state notifications without introducing copy trading.

Exit gate:

- signer/account-wallet separation tested;
- exact approval targets verified;
- deposit and withdrawal state machines reconcile;
- no raw key custody;
- unsupported regions fail closed;
- relayer budgets and kill switch verified.

## PHASE-3 — Web Trading Core

Goal: production-grade web order preview, authorization, submission, partial fills, open orders, cancellation, and reconciliation.

Also ship deterministic market-health views: executable depth, spread, estimated price impact, liquidity shock, order-book imbalance, and execution-quality capture. These analytics must not sit in the critical order-submission path.

Exit gate:

- signed fields match preview;
- standard/Negative Risk contract selection passes golden vectors;
- timeout enters reconciliation rather than duplicate submit;
- fee and max-loss disclosure verified;
- critical web E2E journeys pass.

## PHASE-4 — Portfolio, Redemption, and Withdrawal

Goal: activity, positions, PnL, split/merge/convert, resolution, redeem, and complete asset exit.

Also ship portfolio exposure, claimable/cutoff notifications, trade journal, large-trade feed, explainable wallet profiles, and statistically shrunk smart-money views.

Exit gate:

- position projections reconcile with authoritative sources;
- all asset transformations have preview and receipt;
- redemption and withdrawal failure recovery tested;
- rounding and fixed-point vectors pass.

## PHASE-5 — Android Compose Markets

Goal: native Android feature parity for approved V1 capabilities using shared contracts and secure wallet handoff.

Include the shared watchlists, alert rule editor, signal inbox, whale/large-trade feed, wallet profile, market-health views, charts, and privacy-aware Glance widgets. Android must consume backend-computed signals rather than independently classifying wallets or trades.

Exit gate:

- Compose UDF architecture and module constraints enforced;
- generated API contract tests pass;
- wallet resume/rejection/wrong-chain paths pass;
- order signing cannot use stale preview;
- performance, accessibility, security, and closed-track release checks pass;
- notification delivery/deep-link/retraction and widget privacy/freshness tests pass.

## PHASE-6 — Hardening, CI/CD, and SRE

Goal: security review, performance, chaos/failure testing, complete pipelines, observability, backup/restore, and incident readiness.

Load-test shared ingest, signal computation, indexed rule matching, and fan-out. Define false-positive, duplicate, late-signal, retraction, delivery, and notification-cost SLOs and kill switches.

Exit gate:

- release artifacts are reproducible and signed;
- restore and rollback rehearsals pass;
- kill switches and degraded modes exercised;
- high-severity threat findings closed or formally accepted;
- alert outage cannot block trading and signal replay/retraction drills pass.

## PHASE-7 — Production Launch

Goal: controlled web/backend production launch and staged Android release.

Exit gate:

- legal/compliance/store gates approved;
- Builder production access verified;
- on-call and incident ownership active;
- canary metrics within thresholds;
- intelligence precision/latency, push delivery, opt-out, abuse, and infrastructure-cost thresholds remain within approved bounds;
- rollback remains available;
- launch evidence archived.

## PHASE-8 — Post-V1 Advanced Capabilities

Potential scope:

- official Combos requester capability;
- unusual-activity risk heuristics;
- cross-market relationship and theoretical-discrepancy scanning;
- PMXT-style cross-venue normalization;
- research-grade constraint and fair-value models after independent validation;
- AI narration over deterministic evidence;
- manual copy-intent that still requires a fresh preview and explicit signature;
- advanced analytics;
- professional API/subscription;
- additional wallet/onramp providers;
- improved execution analytics.

Nothing in Phase 8 may be silently pulled into V1.
Autonomous copy trading is not automatically approved by Phase 8; it requires a separate product, custody, security, legal, policy, and human-approval program.

---

# 16. Per-phase document contract

Every `PHASE-*.md` must contain:

```text
Phase ID and exact name
Business outcome
Technical outcome
Prerequisites
Dependencies
In scope
Out of scope
Repository areas affected
New modules/files expected
Data migrations
API/schema changes
External integrations
On-chain interactions
Security controls
Observability
Test plan
CI/CD changes
Deployment sequence
Rollback sequence
Risks and mitigations
Human approvals
Task breakdown
Parallelization constraints
Definition of ready
Acceptance criteria
Verification evidence
Definition of done
Handoff to next phase
```

Every implementation task must be small enough for one agent to complete and verify without hidden cross-phase work.

---

# 17. Agent harness

The agent harness is a first-class deliverable.

## 17.1 Operating contract

`AGENT_OPERATING_CONTRACT.md` must instruct future agents to:

- read the document map, current phase, task spec, relevant ADRs, and repository instructions before acting;
- verify the worktree and preserve unrelated user changes;
- remain within the authorized phase/task;
- never invent external addresses, versions, secrets, or successful tests;
- stop on missing authority, ambiguous custody/signing, destructive migration, or production-write requirement;
- make the smallest coherent change;
- update tests and docs with code;
- run the specified verification;
- capture evidence;
- create a structured handoff;
- never mark blocked work complete.

## 17.2 Implementation manifest

Create `implementation-manifest.yaml`:

```yaml
product: retropick-markets
version: v1
mode: documentation_baseline
current_phase: PHASE-0
phase_order:
  - id: PHASE-0
    name: Discovery and Spec Freeze
    status: planned
    spec: docs/markets-v1/phases/PHASE-0-DISCOVERY-AND-SPEC-FREEZE.md
    prerequisites: []
    tasks: []
    exit_gate: []
products:
  web:
    enabled: true
  backend:
    enabled: true
  android:
    enabled: true
    ui_stack: Jetpack Compose
    language: Kotlin
  custom_markets_contract:
    enabled: false
external_authorities:
  venue: Polymarket
  chain: Polygon
  collateral: verify_current_pUSD_configuration
human_approval_gates: []
unresolved_blockers: []
```

Populate all phases and actual decisions. Do not leave placeholder task IDs when the documentation is final.

## 17.3 Task graph

`task-graph.yaml` must define:

```yaml
id: MKT-P1-001
phase: PHASE-1
title: ""
goal: ""
status: planned
depends_on: []
may_run_in_parallel_with: []
must_not_overlap_with: []
owned_paths: []
read_only_inputs: []
deliverables: []
schema_changes: []
migrations: []
security_requirements: []
tests: []
commands: []
acceptance_criteria: []
verification_evidence: []
rollback: ""
human_approval_required: false
handoff_to: []
```

Rules:

- one owner per writable path in parallel work;
- schemas precede generated clients;
- migrations precede code that requires them;
- backend contract precedes web/Android integration;
- read-only capability precedes transactions;
- transaction preview precedes signing/submission;
- reconciliation precedes production order enablement;
- Android trading follows stable backend/web trading contracts;
- production launch follows hardening.

## 17.4 Traceability

Every requirement gets an ID:

- `MKT-FR-*` functional;
- `MKT-NFR-*` non-functional;
- `MKT-SEC-*` security;
- `MKT-DATA-*` data;
- `MKT-OPS-*` operations;
- `MKT-AND-*` Android;
- `MKT-WEB-*` web;
- `MKT-POLY-*` upstream integration.

Map:

```text
requirement
→ evidence/decision
→ architecture component
→ phase
→ task
→ test
→ production metric
→ runbook
```

No launch-critical requirement may remain unmapped.

---

# 18. Human approval gates

Explicitly stop later implementation agents before:

- creating or changing any production wallet;
- enrolling/changing Builder fee configuration;
- using Builder/relayer production credentials;
- sending a real transaction;
- deploying a custom smart contract;
- enabling a new jurisdiction;
- enabling custody or embedded-key recovery;
- running a destructive migration;
- rotating production secrets;
- releasing to Google Play production;
- removing a rollback path;
- accepting a high/critical security risk.

Document the exact evidence a human needs to approve each action.

---

# 19. Required diagrams

At minimum create:

1. system context;
2. deployable/container architecture;
3. trust boundaries;
4. web order sequence;
5. Android wallet/signing sequence;
6. account-wallet creation/approval sequence;
7. deposit/funding sequence;
8. withdrawal sequence;
9. order state machine;
10. funding/withdrawal state machine;
11. CTF split/merge/redeem flow;
12. standard versus Negative Risk routing decision;
13. realtime snapshot/gap recovery;
14. chain indexing/reorg reconciliation;
15. CI/CD promotion;
16. production incident/degraded-mode decision flow;
17. Gradle module graph;
18. phase/task dependency graph.

Keep diagrams bounded and readable. Use tables instead when exact field mappings matter more than topology.

---

# 20. Required failure matrices

For every critical journey, document:

| Failure | Detection | User-visible state | Automatic action | Retry safety | Reconciliation | Alert | Runbook |
|---|---|---|---|---|---|---|---|

Include:

- upstream 4xx/5xx;
- rate limit;
- malformed payload;
- stale book;
- WebSocket gap;
- matching-engine restart;
- wallet rejected;
- wallet disconnected;
- wrong chain/account;
- expired preview;
- insufficient pUSD;
- missing allowance;
- relayer pending/failed;
- RPC unavailable;
- chain reorg;
- bridge pending/stuck;
- deposit wrong token/network;
- order submit timeout;
- duplicate order;
- cancel/fill race;
- market closed while signing;
- resolution delayed/disputed;
- redemption failure;
- withdrawal wrong destination;
- geoblock service unavailable;
- backend projection divergence;
- Android killed/backgrounded during wallet handoff.

---

# 21. Production readiness checklist

The launch documentation must prove:

- current official production contracts and domains verified;
- upstream SDK/API compatibility tested;
- Builder profile/fees/relayer operational;
- eligibility fail-closed;
- no user private-key custody;
- web and Android disclose venue, fee, max loss/payout, and resolution rules;
- order preview equals signed/submitted payload;
- no unsafe automatic resubmission;
- positions/balances reconcile;
- deposit and withdrawal have end-to-end receipts;
- Negative Risk routing is correct;
- Combos remains disabled unless officially available and tested;
- rate limits and upstream outages degrade safely;
- backups and restore tested;
- dashboards and alerts active;
- incident/on-call contacts assigned;
- web rollback tested;
- backend rollback/forward migration tested;
- Android staged rollout and minimum-version policy ready;
- Play/legal gates approved;
- cost alerts configured;
- runbooks exercised.

---

# 22. Working method

Perform the work in this order:

1. inventory repository and instructions;
2. read supplied baseline documents;
3. research current official external dependencies;
4. audit open-source references, licenses, dependencies, provenance, and adoption modes;
5. create evidence and assumption registers;
6. define capability matrix, feature tiers, signal semantics, and non-goals;
7. create/update ADRs;
8. design target architecture and trust boundaries;
9. specify Polymarket integration and fund flows;
10. specify intelligence ingest, quantitative models, alert rules, and delivery;
11. specify backend and schemas;
12. specify web;
13. specify Android Compose;
14. complete security, testing, CI/CD, SRE, and runbooks;
15. create phases;
16. create task graph and implementation manifest;
17. complete traceability;
18. cross-check all documents;
19. deliver an executive summary and blocker list.

Do not design each document independently. Maintain one vocabulary and one source of truth.

---

# 23. Cross-document invariants

Before finishing, prove these statements are consistently true everywhere:

1. Markets V1 creates Polymarket positions, not PRISM positions.
2. Polymarket is the venue and settlement authority.
3. RetroPick does not run a separate exchange or pool for Markets V1.
4. No custom Markets contract is required by default.
5. pUSD/current collateral details are based on current CLOB V2 evidence.
6. standard and Negative Risk markets route differently when required.
7. Combos is capability-gated.
8. signer and account-wallet addresses are distinct concepts.
9. RetroPick does not hold raw user private keys.
10. user authorization exactly binds the submitted action.
11. Android uses native Kotlin + Jetpack Compose.
12. Android consumes shared versioned RetroPick Markets APIs.
13. money is fixed-point/base-unit, never binary floating point.
14. backend data is a projection, not asset ownership authority.
15. unknown transaction/order states reconcile before retry.
16. unsupported jurisdictions fail closed.
17. each phase has rollback and evidence.
18. production enablement follows security, legal, Builder, and operations gates.
19. public source availability is never treated as a license to copy.
20. missing/ambiguous licenses force clean-room behavioral reimplementation.
21. no VPN/proxy/relay behavior bypasses regional restrictions.
22. intelligence signals are deterministic, versioned, evidence-linked, and retractable.
23. a whale/smart-money/unusual-activity score is descriptive, uncertain, and never an insider accusation.
24. AI may narrate verified deterministic evidence but may not classify, invent metrics, or trigger orders.
25. no automatic or autonomous copy trading exists in V1.
26. every order still requires fresh eligibility, preview, integrity checks, and explicit authorization.
27. theoretical discrepancies are not labeled guaranteed arbitrage.
28. intelligence failure is isolated from trading, balances, and settlement.

Search the complete documentation tree for contradictory language and correct it.

---

# 24. Final response format

After creating the documentation, return:

## Executive outcome

- recommended architecture;
- whether the existing monorepo is reusable;
- final web/backend/Android stack based on repository evidence;
- custom-contract decision;
- custody/signing decision;
- most important current Polymarket constraints;
- locked V1/V1.1/post-V1 intelligence feature sets;
- open-source adoption decisions and clean-room boundaries.

## Documents created or updated

Provide a grouped list with paths.

## Phase plan

Provide all phase IDs/names, goals, dependencies, and exit gates.

## Critical blockers

Separate:

- implementation blockers;
- external/upstream blockers;
- legal/policy blockers;
- human-approval blockers;
- assumptions awaiting evidence.

## First executable phase

State why `PHASE-0` or `PHASE-1` is ready/not ready. Identify the first three agent tasks, but do not execute them.

## Verification summary

Report:

- repository files inspected;
- official sources consulted;
- third-party repositories, immutable commits, licenses, and adoption modes reviewed;
- schema/traceability checks;
- contradictory assumptions found and resolved;
- documents still provisional.

Do not claim the product is implemented. Do not claim production readiness merely because documents exist.

## PROMPT END

---

## Notes for the operator

- Run this prompt with repository access.
- Keep the two baseline documents available as inputs.
- The first run should be documentation-only.
- Approve implementation one phase at a time after reviewing the generated ADRs, evidence register, phase gates, and task graph.
- Re-run upstream evidence validation immediately before implementation because Polymarket APIs, contracts, fees, wallet models, and regional rules are time-sensitive.
