# API

## GET /api/v1/market/header

Query:

```txt
symbol=BTCUSDT
```

Returns 24h market stats and mark/index price.

## GET /api/v1/market/klines

Query:

```txt
symbol=BTCUSDT
interval=1m
limit=500
```

Returns Binance USDⓈ Futures mark-price klines.

## WS /ws/market

Query:

```txt
symbols=BTCUSDT,ETHUSDT
```

Sends:

```json
{
  "type": "PRICE_TICK",
  "observedAt": 1710000000000,
  "prices": {
    "BTCUSDT": {
      "symbol": "BTCUSDT",
      "markPrice": "63732.00",
      "indexPrice": "63751.75"
    }
  },
  "payloadHash": "0x..."
}
```
