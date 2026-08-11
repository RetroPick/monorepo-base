# RetroPick Android — Feature & Architecture Documentation Index

Dokumentasi spesifikasi fitur, arsitektur, dan kontrak OpenAPI yang disalin dari `monorepo-base` untuk pengembangan **RetroPick Android**.

---

## 📱 1. Architecture & Android Specifications
- [ANDROID_MARKETS.md](file:///c:/Project%20Web3/RetroPick-Android/docs/ANDROID_MARKETS.md) — Spesifikasi arsitektur utama Android (Jetpack Compose, modularisasi data flow, security & wallet).
- [APP_DEMO_GUIDE.md](file:///c:/Project%20Web3/RetroPick-Android/docs/APP_DEMO_GUIDE.md) — Panduan demo aplikasi Android (Discovery feed, orderbook, order ticket, open orders).
- [PHASE-5-ANDROID-COMPOSE-MARKETS.md](file:///c:/Project%20Web3/RetroPick-Android/docs/architecture/PHASE-5-ANDROID-COMPOSE-MARKETS.md) — Roadmap pengembangan fase 5 Compose, FCM Push Notifications, & Wallet handoff.
- [ANDROID_APP_DEMO.md](file:///c:/Project%20Web3/RetroPick-Android/docs/architecture/ANDROID_APP_DEMO.md) — Panduan demo arsitektur Android.
- [markets-phase-1-3-realtime-intelligence.md](file:///c:/Project%20Web3/RetroPick-Android/docs/architecture/markets-phase-1-3-realtime-intelligence.md) — Protokol real-time WebSocket hub (`/api/v1/markets/realtime`).
- [polymarket-builder-v2-integration.md](file:///c:/Project%20Web3/RetroPick-Android/docs/architecture/polymarket-builder-v2-integration.md) — Integrasi Polymarket CLOB V2 & Builder code signing.

---

## 🐋 2. Smart Money & Trader Intelligence (`docs/intelligence/`)
- [01_WHALE_TRADE_FEED.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/01_WHALE_TRADE_FEED.md) — Stream transaksi paus (*Whale Feed*).
- [02_WALLET_SEARCH.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/02_WALLET_SEARCH.md) — Pencarian dompet trader (ENS / Address).
- [03_WALLET_PROFILE.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/03_WALLET_PROFILE.md) — Profil kuantitatif dompet (volume 30-hari, win rate, & badge).
- [04_WALLET_PERFORMANCE_METRICS.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/04_WALLET_PERFORMANCE_METRICS.md) — Metrik performa trading.
- [05_SMART_MONEY_LEADERBOARD.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/05_SMART_MONEY_LEADERBOARD.md) — Papan peringkat dompet *Smart Money*.
- [06_FOLLOW_WALLET.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/06_FOLLOW_WALLET.md) — Fitur *Follow/Watchlist* dompet.
- [07_TOP_HOLDERS.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/07_TOP_HOLDERS.md) — Daftar 10 pemegang posisi terbesar (*Top Holders*) pada detail pasar.
- [08_BASIC_WHALE_ALERTS.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/08_BASIC_WHALE_ALERTS.md) — Sistem alert notifikasi transaksi paus.
- [09_PAPER_COPY.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/09_PAPER_COPY.md) — Fitur simulasi *Paper Copy-Trading*.
- [10_QUICK_BACKTEST.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/10_QUICK_BACKTEST.md) — Quick backtest strategi trading.
- [INTELLIGENCE_LAUNCH_V1.md](file:///c:/Project%20Web3/RetroPick-Android/docs/intelligence/INTELLIGENCE_LAUNCH_V1.md) — Arsitektur & rencana rilis Smart Money Intelligence V1.

---

## 📜 3. Trading Lifecycle & OpenAPI Contract
- [ORDER_LIFECYCLE.md](file:///c:/Project%20Web3/RetroPick-Android/docs/polymarket/ORDER_LIFECYCLE.md) — Alur transaksi Limit Order, EIP-712 wallet signing, dan rekonsiliasi.
- [markets-v1.yaml](file:///c:/Project%20Web3/RetroPick-Android/docs/schemas/markets-v1.yaml) — Kontrak OpenAPI kanonikal `markets-v1` yang dikonsumsi oleh Ktor/Retrofit Kotlin client.
