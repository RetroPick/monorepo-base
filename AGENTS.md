<claude-mem-context>
# Memory Context

# [monorepo-base] recent context, 2026-04-30 5:05pm GMT+7

No previous sessions found.
</claude-mem-context>

## Learned User Preferences

- Prefers Polymarket-style market detail UX: the market headline reads as one flat strip on the page background in the main (chart) column, with the chart in a separate bordered card below—avoid a full-width band that visually splits the site header from the title/buy layout.
- Prefers **Stake.com**-inspired styling for the **Discover/Trending** market-types strip (upper homepage area).
- Market-type education and “how to trade” / prediction-market explainers should use **plain language** and **step-by-step** flow through payout for **mixed audiences** (crypto-savvy and **non-crypto-native**), not dev-only jargon.
- Prefers **Connect Wallet** on portfolio to use the **header / AppKit** control (no separate navigation to another page or “new web” just to connect).
- Prefers **USD-style ($) labels** for stake, balance, and PnL figures on portfolio and related dashboard surfaces (readable dollar-style amounts, not wei or raw integer emphasis).
- Prefers a **compact header** strip: keep education entry (“How”) **beside Connect Wallet**, drop a top-level **Docs** link from the upper navbar when simplifying chrome, and **omit the theme toggle from the header** if theme is available elsewhere (e.g. footer).

## Learned Workspace Facts

- Local `pnpm dev:fe-v1` and the Compose `web` service (`retropick-web`) both use port **3000**; only one should run at a time for that port (stop the container to use host dev server, or remap).
- API for local Compose work is commonly checked at **`http://127.0.0.1:8080`** (`retropick-api`).
- Compose v2 can warn about Bake when **Buildx** is missing: install the **`docker-buildx`** CLI plugin (e.g. `docker-buildx-plugin` from Docker’s APT repo after configuring Docker sources, or a binary under `~/.docker/cli-plugins/`—see README Troubleshooting if `apt` cannot find the package).
- **`apps/fe-v1/Dockerfile`** uses Dockerfile syntax `# syntax=docker/dockerfile:1`, **`NEXT_TELEMETRY_DISABLED=1`**, **`corepack prepare pnpm@10.0.0`**, **filtered** `pnpm install --filter fe-v1... --store-dir=/pnpm/store`, and (with BuildKit) cache mounts for the pnpm store and **`apps/fe-v1/.next/cache`** so repeat image builds hit cache when dependencies are unchanged.
- **`ManualMarketPage`** passes **`<Header omitBottomDivider />`** so the sticky site header has no bottom rule above the market headline (blends with **`main`** / page background); sticky offsets still come from measuring **`#app-site-header`** via **`useSiteHeaderOffset`** into **`--market-page-sticky-top`**.
- Sticky market UI (`.market-page-sticky-below-chrome`, `.market-manual-trade-aside`) should align **`top`** with **`calc(var(--market-page-sticky-top, …) + safe-area)`**; avoid clamping sticky **`top`** with a fixed **~9.5rem** floor against a smaller measured header or scrolling content can show in a band between the real header and the sticky title row.
- **Portfolio** (`PortfolioPage`) is **wallet-style**: **`CategoryDistributionCard`** sits in the summary row (replacing the old balance-spot emphasis); **`PortfolioTradingPanel`** often runs with **`embeddedActivity="sidebar"`** and **`PortfolioActivitySidebar`** shows indexed on-chain **Activity** beside trades.
- **`?section=transactions`** on portfolio normalizes to **`section=positions`** so legacy deep links still land on trades while the events table remains in the **Activity** column.
- **`apps/fe-v1/src/config/siteLinks.ts`** holds **Discord / Telegram / X** and placeholder **docs / terms / privacy** URLs consumed by the thin fixed **`Footer`** bar (`socialLinks` + `siteLinks`).