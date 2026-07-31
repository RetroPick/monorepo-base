This is the `fe-v1` Next.js frontend for RetroPick.

## Performance (bundle / LCP)

- **`next.config.mjs`**: `experimental.optimizePackageImports` lists barrel-heavy packages (Radix, `lucide-react`, `wagmi`/`viem`, `@tanstack/react-query`, `recharts`, `@reown/*`, `lightweight-charts`, `@worldcoin/idkit`, etc.) so the compiler can rewrite imports to deep paths.
- **`src/App.tsx`**: the default **`/app/markets/all`** view (`MarketsAll`) is `React.lazy`-loaded so it ships in its own chunk (smaller initial JS vs eager import).
- **Production**: `compiler.removeConsole` strips `console.log` / `console.debug` while keeping `error` and `warn`.
- **Bundle analysis**: `pnpm analyze` (sets `ANALYZE=true` for `@next/bundle-analyzer`).

### LCP on `/app/markets/all` (and other `[[...slug]]` routes)

| Metric (typical local prod build, mobile emulation) | Before (baseline) | After (this repo) |
| --- | --- | --- |
| First meaningful paint | Body stayed empty until `ClientApp` JS executed (`dynamic(..., { ssr: false })`). | **`app/[[...slug]]/loading.tsx`** renders a server HTML shell (pulse + “RetroPick”) immediately. |
| Font critical path | CSS named `Inter` / `Plus Jakarta Sans` / `JetBrains Mono` with **no** bundled files → browser used system stack first; optional late swap if fonts were added elsewhere. | **`app/layout.tsx`** imports **`@fontsource/*`** weight CSS so fonts load **same-origin** (no `fonts.googleapis.com` round trip). |

**How to measure:** start production server (`pnpm build && pnpm start` from this app), then run Lighthouse (Chrome) against `http://localhost:3000/app/markets/all` with **mobile** device emulation — compare **LCP** and **FCP** before/after on the same machine. CI agents may skip numeric capture; the table above documents intent and mechanism.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

For local development, the app falls back to:
- API: `http://127.0.0.1:8080`
- Docs: `http://localhost:3002/docs`

## Deploy on Vercel

This app lives in a pnpm monorepo, so Vercel must target the app directory rather than the repository root.

Required Vercel project settings:

- Root Directory: `apps/fe-v1`
- Framework Preset: `Next.js`
- `NEXT_PUBLIC_API_URL=https://api.<your-domain>`
- `NEXT_PUBLIC_DOCS_URL=https://<your-docs-host>`
- `FRED_API_KEY=<your-fred-key>` (preferred) or `NEXT_PUBLIC_FRED_API_KEY=<your-fred-key>`

The app-level [vercel.json](./vercel.json) then runs:

```json
{
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm --filter @retropick/markets-v1 build"
}
```

If your Vercel project is currently building from the repository root, change the Root Directory to `apps/web`. Otherwise Vercel will execute the app-level `cd ../..` commands from the wrong starting directory and `pnpm install` will resolve to `/`, which fails with `ERR_PNPM_NO_PKG_MANIFEST`.

Important deployment rule:

- `apps/fe-v1` is the Vercel app
- `apps/backend` is not deployed to Vercel; it must stay on a persistent backend runtime such as the VPS stack

## Bundle analysis (local)

After `pnpm install` from the repo root:

```bash
pnpm --filter @retropick/markets-v1 analyze
```

This sets `ANALYZE=true` for one `next build` and runs `@next/bundle-analyzer` on the client + server bundles. By default the treemap **does not** auto-open a browser (headless-safe). To open it locally after the build, run with `OPEN_ANALYZER=true` or open the generated HTML under `.next` / the path printed at end of the build. Use the report to find oversized chunks before changing imports or adding `next/dynamic` splits.

Normal production builds are unchanged (`ANALYZE` unset).

### Analyzer follow-ups (largest chunks + fixes)

Open `.next/analyze/client.html` after `pnpm analyze`. Chunk **file names are hashed** each build; use **role** and `.next/react-loadable-manifest.json` to map keys like `app/[[...slug]]/page.tsx -> ./ClientApp` to `static/chunks/*.js`.

**Top roles (typical prod tree):**

1. **Primary `ClientApp` graph** — webpack files listed under `app/[[...slug]]/page.tsx -> ./ClientApp` in `react-loadable-manifest.json`: `WagmiProvider` + `src/config` (`WagmiAdapter`, `@reown/appkit-adapter-wagmi`, multi-chain transports), `react-router-dom`, `AppProviders`, and synchronous context. This is the largest parse/execute block before route-level `React.lazy` chunks.
2. **Shared “markets” vendor** — chunks shared by `MarketsAll`, `ChainMarkets`, and `ChainMarketDetail` lazy entries (often `viem` + hooks + UI primitives). Keep route components lazy; avoid pulling chart stacks into `AppProviders`.
3. **WalletConnect / connector subgraph** — additional async splits from `@wagmi/connectors` and friends; expect webpack “critical dependency” warnings from upstream `ox` tempo pool (noise only unless you fork deps).

**Measurable change shipped:** `OnboardingModal` is `React.lazy`-loaded from `OnboardingContext` only when `showModal` is true, so **framer-motion** and the funding dialog subtree are no longer in the cold `ClientApp` graph. On one Linux build, the **sum of byte sizes** of the three `ClientApp` manifest files dropped from **~1.99 MiB → ~1.81 MiB** (~**180 KiB** less JS to fetch/parse on paths where onboarding does not open); onboarding then loads its own async chunk (~**175 KiB**) only when a wallet needs the modal.

### Wallet / AppKit cold path (measurement + behavior)

**Goal:** keep `WagmiProvider` + `wagmi` config on the critical path (read-only chain + hooks), but avoid **eager** `@reown/appkit/react` work on first paint.

**Mechanism (this repo):**

- **`src/lib/retropickAppKit.ts`** — single `ensureAppKitInitialized()` that runs `createAppKit` once (dynamic `import("@reown/appkit/react")`).
- **`Web3ModalProvider`** — calls **`scheduleIdleAppKitInit()`** (`requestIdleCallback` + 10s timeout, `setTimeout` fallback) instead of a second mount effect that imported `modal` and awaited **`modal.ready()`** immediately (that duplicated work and competed with LCP).
- **`openAppKitModal`** — no static import of `modal`; it awaits **`ensureAppKitInitialized()`** then dynamic-imports **`modal`**, then `ready()` + `open()`. So the **Header** chunk no longer hard-depends on the AppKit modal bundle until the user taps **Sign in** / **Sign up** (or another callsite runs `openAppKitModal`).

**How to measure:** same prod server as LCP; Chrome DevTools **Performance** or **Coverage** on cold load — confirm `@reown/appkit/react` loads after idle or after the first connect click, not synchronously with the first document. Re-run **`pnpm --filter @retropick/markets-v1 analyze`** and compare whether `openAppKitModal`’s module moved out of the initial Header-related graph (exact chunk names stay hashed).

**Manual smoke (operator):** on **Base Sepolia**, from a cold tab: open markets → **Sign in** → complete connect → sign a test action the product exposes (e.g. bookmark or trade flow you use for QA). Google / email flows should still open after AppKit init (idle warm + click-path `ensure` cover fast and slow users).
