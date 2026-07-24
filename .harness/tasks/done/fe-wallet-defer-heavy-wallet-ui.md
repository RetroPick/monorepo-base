# fe-wallet: defer heavy wallet UI

## Scope

Measure wallet-related JS on cold load; defer AppKit / modal / SDK init behind explicit user intent where protocol-safe.

## Acceptance

- [x] Short note on measurement method + result in `apps/web/README.md` or task comment.
- [x] Connect path: `openAppKitModal` awaits `ensureAppKitInitialized` then loads `modal` — no regression vs prior sync `modal.ready()` + `open()`. **Operator:** re-smoke Sign in / Google on Base Sepolia after release (not run in CI here).
- [x] `pnpm verify` exit 0.

## Owner

`fe-wallet`

## Shipped

- `src/lib/retropickAppKit.ts` — central `ensureAppKitInitialized` + `scheduleIdleAppKitInit`.
- `Web3ModalProvider` — idle-scheduled init; removed eager `prewarmModal` mount effect.
- `openAppKitModal` — dynamic `import("@reown/appkit/react")` after ensure (Header no longer static-pulls modal).
- `useAppKitReady` — same dynamic path, no static `modal` import.
