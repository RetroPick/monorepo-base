# 06 — Internal gRPC Service Spec

## 1. When to use

Use Go interfaces first. Add gRPC after services are stable separate binaries.

Do not expose gRPC to browser.

## 2. Services

```txt
MarketStateService
DepositService
MarketDataService
OracleStateService
KeeperService
RealtimeEventService
```

## 3. Event envelope proto

```proto
syntax = "proto3";

package retropick.realtime.v1;

message EventEnvelope {
  uint64 seq = 1;
  string type = 2;
  string channel = 3;
  string scope = 4;
  string template_id = 5;
  uint64 epoch_id = 6;
  string user_address = 7;
  uint64 block_number = 8;
  string tx_hash = 9;
  string created_at = 10;
  bytes payload_json = 11;
}
```

## 4. MarketStateService

```proto
service MarketStateService {
  rpc GetMarketList(GetMarketListRequest) returns (GetMarketListResponse);
  rpc GetMarketSnapshot(GetMarketSnapshotRequest) returns (MarketSnapshot);
  rpc WatchMarketEvents(WatchMarketEventsRequest) returns (stream EventEnvelope);
}
```

## 5. DepositService

```proto
service DepositService {
  rpc CreateFundingIntent(CreateFundingIntentRequest) returns (FundingIntent);
  rpc GetFundingOptions(GetFundingOptionsRequest) returns (FundingOptions);
  rpc SelectRoute(SelectRouteRequest) returns (SelectedRoute);
  rpc GetDepositStatus(GetDepositStatusRequest) returns (FundingIntent);
  rpc WatchDeposit(WatchDepositRequest) returns (stream EventEnvelope);
}
```

## 6. MarketDataService

```proto
service MarketDataService {
  rpc GetCandles(GetCandlesRequest) returns (GetCandlesResponse);
  rpc WatchTicks(WatchTicksRequest) returns (stream PriceTick);
  rpc WatchCandles(WatchCandlesRequest) returns (stream Candle);
}
```

## 7. KeeperService

```proto
service KeeperService {
  rpc GetSchedule(GetScheduleRequest) returns (KeeperSchedule);
  rpc PreflightAction(PreflightActionRequest) returns (PreflightResult);
  rpc WatchKeeperEvents(WatchKeeperEventsRequest) returns (stream EventEnvelope);
}
```

## 8. Security

MVP:

```txt
bind gRPC to 127.0.0.1 only
```

Later:

```txt
mTLS
service identity
no public gRPC
audit operator-affecting calls
```
