# 08 — Market Data and Chart Service

## 1. Principle

```txt
Chart data = UX reference
Oracle checkpoint = settlement truth
```

The chart can use Binance/CoinGecko/other data sources. Settlement must use the configured oracle/checkpoint.

## 2. Service responsibilities

```txt
connect to price sources
normalize ticks
keep latest prices in memory
build candles
persist candles
publish chart events
monitor source health
```

## 3. Architecture

```txt
Price source
  → MarketDataService
  → tick normalizer
  → in-memory ring buffer
  → candle builder
  → PostgreSQL price_candles
  → realtime_events / WS chart channel
  → PriceChart component
```

## 4. REST endpoint

```http
GET /api/v1/markets/{templateId}/chart?interval=60&limit=500
```

## 5. WebSocket channel

```txt
chart:{feedId}:{intervalSec}
```

## 6. Events

```json
{
  "type": "candle_updated",
  "channel": "chart:btc-usd:60",
  "payload": {
    "feedId": "btc-usd",
    "intervalSec": 60,
    "bucketStart": "2026-05-02T12:01:00.000Z",
    "openE8": "6420000000000",
    "highE8": "6430000000000",
    "lowE8": "6419000000000",
    "closeE8": "6425000000000",
    "source": "binance"
  }
}
```

## 7. Do not overload PostgreSQL

Do not persist every raw tick unless needed.

Recommended:

```txt
raw ticks: in-memory and WS throttled
1m candles: persisted
5m/15m/1h/1d candles: persisted
```

## 8. Throttling

```txt
Price label: max 1 update/sec
Chart candle: max 1 update/sec
Backend ingestion: can be faster
```

## 9. Failure handling

If chart source fails:

```txt
show "Chart feed delayed"
market still operates if settlement oracle is healthy
```

If settlement oracle fails:

```txt
show oracle_stale
keeper may skip/halt according to policy
```
