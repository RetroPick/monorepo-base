## Learned User Preferences

- When an implementation plan is attached, do not edit the plan file; use the existing todo list, mark items in progress, and run tasks through completion unless the user changes scope.
- For large or scaffolded work, expect alignment with project docs under `.dev/`, `package/abi/`, and `package/contract/`, and use the Superpowers plugin with `.agents` guidance as part of the workflow.
- The manual market and main trading experience in `fe-v1` are iteratively tuned using UI references (screenshots, short recordings, Polymarket-style layout cues).
- For manual market buys in `fe-v1`, after USDC `approve` the flow should wait for inclusion (receipt and allowance refetch) before `depositToSide`; a fixed post-approve sleep alone is unreliable for the second wallet prompt.

## Learned Workspace Facts

- This monorepo uses pnpm and `workspace:*` package references; use `pnpm` from the repository root. Running plain `npm install` inside a workspace package can fail with `EUNSUPPORTEDPROTOCOL` on `workspace:*`.
- The end-user frontend is `apps/fe-v1` (Vite; local dev often `http://localhost:5173`), with live code under `apps/fe-v1/src`. The older `apps/web` was removed after parity migration, and `apps/fe-v1/sources/front-end-v2` is legacy curation/draft-board material, not canonical — canonical MarketEngine behavior follows `package/contract`, `package/abi`, and `.dev/abi-map`.
- The operator UI is `apps/ops` (Next.js). Local dev uses `node scripts/dev.mjs`, which prefers port 3001 and falls back to the next free port in a short range; set `PORT` to pin. Configure `NEXT_PUBLIC_API_URL` if the API is not reachable at the app default.
- The Go API lives in `apps/backend` (for example `go run ./cmd/api` with `PORT` and `DATABASE_URL`). Local health and config are often probed on port 8080. Only `cmd/api` runs embedded SQL migrations (`RunMigrations`); `cmd/indexer`, `cmd/keeper`, and `cmd/alert` use `WaitForSchema`, and Compose starts the indexer after the API so migrations apply first. For MarketEngine view calls that return a single Solidity tuple (`getPositionView`, `getEpochView`, `getOperatorGlobalView`, `getOperatorTemplateView`), decode via the `unpackSingleTuple` helper in `apps/backend/internal/ethops`—`UnpackIntoInterface` into the flat Go structs triggers a go-ethereum `copyAtomic` bug (`cannot unmarshal struct ... in to bool`).
- Sticky asides in `fe-v1` that must clear the two-row site header use `lg:top-28` (not `lg:top-20`) so content does not slide under the navbar, consistent with other pages such as portfolio.
- `package/contract/.operator/.runbook.md` is the canonical operator runbook for the `upsertTemplate → initializeMarket → epoch actions` flow; `package/contract/.operator/.marketType.md` documents the 9 market type variants; `package/contract/.operator/.launcMarket.md` has full end-to-end launch examples (note the filename spelling in-repo). Per-type fixtures live under `package/contract/.operator/upsert-params/<NN>-*.json` (e.g. `01-direction.manual.json`); `templateId` is derived from `slug`, so re-upserting preserves epoch state. A new manual epoch cannot open while the indexer still shows `lastResolvedEpochId` behind `activeEpochId`—complete lock then resolve for the current epoch first or the engine reverts `PreviousEpochUnresolved` (do not skip epoch ids).
- Market deployment scripts live under `package/contract/scripts/market/`. Key env vars: `RPC_URL`, `CAST_ACCOUNT`, `BROADCAST=1`, `API_URL` (default `http://127.0.0.1:8080`). Calldata is always fetched from the local API before broadcasting on-chain.
- `package/contract/scripts/market/broadcast-prepared-ops-tx.sh` defaults to explicit `--nonce` from `cast nonce <sender> -B pending` so sequential batch sends avoid RPC `nonce too low` (`BROADCAST_EXPLICIT_NONCE=0` to disable), and runs an `eth_call` precheck before unlocking the keystore (`BROADCAST_PRECHECK=0` to skip for payable / hooks the read path can't model).
- In `fe-v1`, manual trading stays blocked until the indexer shows an active epoch in the open betting window (after on-chain `openEpoch`, or the rolling genesis path in the operator runbook for rolling markets).
- The full stack (API, indexer, ops) is run via Docker; always start Docker before testing `apps/ops` or running market deployment scripts.
- `.dev/frontend/user/` and `.dev/backend/user/` contain the integration spec for the `fe-v1` fullstack app; use them alongside `package/abi/` when wiring the end-user UI to the backend. The curated price-feed registry consumed by the operator UI is `apps/backend/internal/feedregistry/registry.json` (v2 points at the non-gated Base Sepolia feeds).
- On Base Sepolia, the Chainlink feeds at `0xa24A68…`, `0x961AD2…`, `0xAc6DB6…` are gated by `SimpleWriteAccessController` and revert `No access` for contract reads via the engine; use the non-gated ETH/USD `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1`, BTC/USD `0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298`, LINK/USD `0xb113F5A928BCfF189C998ab20d753a47F9dE5A61`, and call `ChainlinkAdapter.setFeedDecimals(feedId, 8)` once as the adapter's `Ownable2Step.owner`. `scripts/RETRODEPLOYER` exposes `feeds probe`, `feeds fix-adapter`, `recover-stuck-epoch <NN>` (one-shot fix-adapter → re-upsert → advance-epoch), `advance-epoch` (alias for `activate-epoch --advance`, time-gates lock→resolve→open), and `monitor trade-ready` (indexer vs on-chain readiness).


<claude-mem-context>
# Memory Context

# [V1] recent context, 2026-04-27 1:04am GMT+7

No previous sessions found.
</claude-mem-context>