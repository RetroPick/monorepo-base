# RetroPick Development

**Current product baseline:** Markets V1  
**Canonical phase:** read `current_phase` from `.harness/products/markets-v1/planning/implementation-manifest.yaml`  
**Current phase:** PHASE-2

This directory is the developer entrypoint for the active RetroPick Markets V1 codebase. The current product is a Polymarket-native client architecture; historical runtime is preserved by Git history, not by an active `archive/` tree.

## Canonical architecture

```text
Polymarket Gamma / CLOB / Data / WebSocket APIs
                     ↓
             Go Markets BFF
               apps/backend
                     ↓
        OpenAPI / AsyncAPI contracts
          ↙                    ↘
     apps/web              apps/android
```

Core rules:

- `apps/backend` is the anti-corruption layer for canonical Markets semantics.
- Web and Android consume canonical RetroPick APIs/schemas; they do not bypass the BFF for product semantics.
- `apps/android` is the approved Android gitlink. Do not replace it with a second Android tree.
- Markets V1 does not operate a custom RetroPick exchange or settlement engine.
- PRISM is a separate future product and is out of scope for current Markets V1 implementation unless an explicit future phase authorizes work.

## Current repository map

```text
retropick/
├── apps/
│   ├── backend/          # Go Markets BFF
│   ├── web/              # Markets web client
│   ├── android/          # approved RetroPick-Android gitlink
│   └── landing-web/      # separate marketing surface
├── packages/
│   └── polymarket/       # shared Polymarket integration/types
├── schemas/
│   ├── openapi/          # canonical HTTP contracts
│   └── asyncapi/         # canonical realtime contracts
├── docs/markets-v1/      # human-facing Markets docs
├── .dev/markets-v1/      # implementation-grade Markets docs
└── .harness/products/markets-v1/  # governance, planning, evidence
```

## Start here

1. Read [Markets V1 README](markets-v1/README.md).
2. Read [`AGENT_OPERATING_CONTRACT.md`](../.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md).
3. Read the live phase from [`implementation-manifest.yaml`](../.harness/products/markets-v1/planning/implementation-manifest.yaml).
4. Select work from the Markets task graph; do not infer phase authority from stale prose.
5. Validate with the repository's canonical CI/build/test commands before handoff.

## Current development surfaces

- Backend: `apps/backend/internal/markets/`, `apps/backend/cmd/markets-api/`
- Web: `apps/web/src/products/markets/`
- Android: `apps/android` gitlink
- HTTP contract: `schemas/openapi/markets-v1.yaml`
- Realtime contract: `schemas/asyncapi/markets-realtime-v1.yaml`
- Polymarket adapter/types: `packages/polymarket/`

## Release boundary

Development-ready does not mean production-ready. PHASE-2 blockers, legal review, staging proof, wallet/on-chain approvals, and later secure-trading work remain governed by the Markets V1 harness.

For implementation details and current blockers, use `.dev/markets-v1/` and `.harness/products/markets-v1/` as the source of truth.
