# RetroPick V10 Fullstack Architecture

## Services

### Web
- Next.js serves the terminal UI.
- `public/terminal.html` contains the latest V10 clean chart interface.
- It connects to the backend for live Binance display data.
- If backend is not connected, it falls back to local demo movement.

### Backend
- Go server proxies Binance public endpoints.
- Provides CORS-safe HTTP endpoints and WebSocket stream.

Endpoints:
- `GET /health`
- `GET /api/v1/market/header?symbol=BTCUSDT`
- `GET /api/v1/market/klines?symbol=BTCUSDT&interval=1m&limit=500`
- `GET /api/v1/market/types`
- `WS /ws/market?symbols=BTCUSDT,ETHUSDT`

### PostgreSQL
Schema includes:
- `market_templates`
- `rounds`
- `positions`
- `evidence_snapshots`

## 9 Market Types

1. Direction
2. Threshold
3. RangeClose
4. Velocity
5. Ladder
6. Convergence
7. Composite
8. Corridor
9. Cascade

## UX rules

- No explanation cards on top of the chart.
- Chart area is for price action.
- Side panel explains rules, formula, outcomes, and evidence.
- LOCK / RESOLVE / PAYOUT markers are timestamp-based and pass through the chart.
- Payout phase keeps final winner color.
