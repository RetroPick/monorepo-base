# RELEASE_GOAL — RetroPick Markets V1

**Ship production-capable RetroPick Markets V1 on Web and Android through a shared Go Markets BFF.**

- Target release surfaces: **Web** (`apps/web`) and **Android** (`RetroPick/RetroPick-Android`).
- Shared platform: **Go Markets BFF** (`apps/backend`, `cmd/markets-api`, `internal/markets`).
- Canonical API contract: `schemas/openapi/markets-v1.yaml`.
- Upstream venue authority: Polymarket (Gamma / CLOB / Data / WebSocket). Polymarket remains venue truth; RetroPick PostgreSQL projections/reconciliation are RetroPick state.
- The release factory **prioritizes launch blockers over feature expansion**.

## Out of release scope

- PRISM integration
- Legacy epoch MarketEngine (archived under `archive/`)
- Old pool-v1 feature expansion
- Custom prediction-market contracts
- Unrelated operator surfaces
- Speculative new features
- Android Compose rewrite (use existing application architecture + Capacitor wrapper unless explicitly authorized later)

## Definition of done (release)

All gates in `GATES.yaml` green, backed by executable evidence (tests/CI/staging), security review APPROVE, human release gate crossed — and release state recorded at `~/.local/state/retropick-harness/release-state.yaml`.

## Non-negotiables

- Web and Android are clients of the **same** backend. No separate Android backend.
- No direct canonical Polymarket dependency from clients as a shortcut.
- No geoblock circumvention, no fabricated upstream state, no private-key custody in the product path.
- Human gates (see `HUMAN_GATES.yaml`) are never crossed autonomously.
