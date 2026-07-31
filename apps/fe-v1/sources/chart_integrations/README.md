# RetroPick V10 Fullstack Clean Chart Terminal

This is the fullstack version of the latest RetroPick V10 clean chart UI.

## Includes

- Go backend
- PostgreSQL schema
- Next.js web app
- Binance USDⓈ Futures display-data proxy
- WebSocket price stream
- Clean V10 chart UI
- 9 RetroPick market types
- Lock / resolve / payout timeline
- Side-panel market guide
- Compact chart legend
- Faster chart rendering

## Run

```bash
cp .env.example .env
docker compose up --build
```

Open:

```txt
http://localhost:3000
```

Backend:

```txt
http://localhost:8080/health
```

Direct terminal HTML:

```txt
http://localhost:3000/terminal.html
```

## Notes

Binance is used as display data for chart/header. Production settlement should still use RetroPick's configured oracle/evidence route and store evidence snapshots in PostgreSQL.
