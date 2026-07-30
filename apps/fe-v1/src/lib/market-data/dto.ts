import { AssetDetailResponse, AssetUniverseEntry, RetroPickRoundCardDTO } from "./types";

export function makeAssetDetailResponse(params: {
  asset: AssetUniverseEntry;
  candles: AssetDetailResponse["candles"];
  interval: AssetDetailResponse["interval"];
  livePriceUsd: number;
}): AssetDetailResponse {
  return {
    asset: params.asset,
    candles: params.candles,
    interval: params.interval,
    livePriceUsd: params.livePriceUsd,
    chartSource: "binance",
    settlementSource: "oracle",
  };
}

export function makeRetroPickRoundCard(params: {
  roundId: string;
  slug: string;
  asset: AssetUniverseEntry;
  lockTime: string;
  closeTime: string;
  status: RetroPickRoundCardDTO["status"];
  intervalLabel: string;
  oracleSource?: string;
}): RetroPickRoundCardDTO {
  return {
    roundId: params.roundId,
    slug: params.slug,
    assetId: params.asset.id,
    assetSymbol: params.asset.symbol,
    assetName: params.asset.name,
    displayPair: params.asset.displayPair,
    oracleSource: params.oracleSource ?? "Chainlink Price Feed",
    roundType: "UP_DOWN",
    intervalLabel: params.intervalLabel,
    lockTime: params.lockTime,
    closeTime: params.closeTime,
    status: params.status,
    currentPriceUsd: params.asset.priceUsd,
    priceChangePct24h: params.asset.priceChangePct24h,
    chartPair: params.asset.exchangeSymbol,
    chartReady: true,
    settlementNote: "Chart data is informational. Settlement uses persisted oracle lock and close snapshots.",
  };
}
