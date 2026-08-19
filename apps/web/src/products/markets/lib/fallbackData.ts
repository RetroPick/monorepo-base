import type {
  CapabilitiesResponse,
  EventDetail,
  EventsListResponse,
  MarketDetail,
  MarketSummary,
  OrderBookSnapshot,
} from "@retropick/polymarket";

import { MARKETS, resolveMarketImage, getOptionThumbnail, type Market } from "./retropickData";

const defaultFreshness = {
  observedAt: new Date().toISOString(),
  stalenessMs: 0,
  ageMillis: 0,
  state: "fresh" as const,
  freshnessState: "fresh" as const,
  provenance: {
    source: "polymarket_clob" as const,
    observedAt: new Date().toISOString(),
    upstreamId: "retropick-accurate-feed",
    upstreamUpdatedAt: new Date().toISOString(),
    contentHash: "retropick-verified-hash-1",
  },
};

const defaultProvenance = {
  source: "polymarket_clob" as const,
  observedAt: new Date().toISOString(),
  upstreamId: "retropick-accurate-feed",
  upstreamUpdatedAt: new Date().toISOString(),
  contentHash: "retropick-verified-hash-1",
};

export const MOCK_CAPABILITIES: CapabilitiesResponse = {
  version: "0.1.0",
  catalog: true,
  trading: false,
  combos: false,
  intelligence: true,
  features: {
    polymarketCatalog: true,
    realtimeWebSocket: true,
    orderbookDepth: true,
    historicalPrice: true,
    intelligenceSignals: true,
    governanceOracle: true,
    order_submit: false,
    portfolio_read: false,
  },
  source: "retropick-bff",
  checkedAt: new Date().toISOString(),
};

export type ExtendedEventDetail = EventDetail & {
  category?: string;
  imageUrl?: string;
  iconUrl?: string;
  image?: string;
  icon?: string;
  volume?: string;
  liquidity?: string;
  participants?: string;
  timeLeft?: string;
  tags?: string[];
  trend?: "up" | "down";
  chart?: number[];
  cardType?: "vs_match" | "binary" | "multichoice";
  teams?: { name: string; logo?: string; prob: number }[];
  options?: { label: string; prob: number; thumbnail?: string | null }[];
  gameInfo?: string;
  accent?: string;
  rawMarket?: Market;
};

// Convert a rich Market from RetroPick Data into an EventDetail
export function marketToEventDetail(m: Market, index: number): ExtendedEventDetail {
  const eventCanonicalId = `polymarket:event:${m.id}`;
  const marketCanonicalId = `polymarket:market:${m.id}-yes`;
  const resolvedImg = resolveMarketImage(m);

  const probYes = m.yes;
  const probNo = 100 - probYes;
  const yesPrice = (probYes / 100).toFixed(2);
  const noPrice = (probNo / 100).toFixed(2);

  const qLower = m.question.toLowerCase();
  const isVsMatch =
    qLower.includes(" vs ") ||
    qLower.includes("natus") ||
    qLower.includes("heretics") ||
    qLower.includes("real madrid") ||
    qLower.includes("manchester") ||
    qLower.includes("t1 vs");

  const isMultiChoice =
    m.marketType === "CONVERGENCE" ||
    m.marketType === "MULTIPLE_CHOICE" ||
    m.marketType === "LADDER" ||
    m.marketType === "VELOCITY" ||
    (m.options && m.options.length > 2);

  const cardType: "vs_match" | "binary" | "multichoice" = isVsMatch
    ? "vs_match"
    : isMultiChoice
    ? "multichoice"
    : "binary";

  // Build options with thumbnails
  const formattedOptions = m.options?.map((opt) => ({
    label: opt.label,
    prob: opt.percentage,
    thumbnail: getOptionThumbnail(opt.label, m),
  }));

  // Build teams for vs match
  let teams:
    | {
        name: string;
        shortName?: string;
        logo?: string;
        flag?: string;
        scores?: string[];
        prob: number;
        bgClass?: string;
      }[]
    | undefined = undefined;

  let gameInfo: string | undefined = undefined;

  if (isVsMatch) {
    if (qLower.includes("swiatek") || qLower.includes("sakkari")) {
      teams = [
        {
          name: "I. Swiatek",
          shortName: "I. Swiatek",
          flag: "🇵🇱",
          scores: ["4", "6", "2"],
          prob: 93,
          bgClass: "bg-[#2F1C24] text-[#F43F5E] hover:bg-[#3D2430]",
        },
        {
          name: "M. Sakkari",
          shortName: "M. Sakkari",
          flag: "🇬🇷",
          scores: ["6", "1", "0"],
          prob: 8,
          bgClass: "bg-[#1C233A] text-[#818CF8] hover:bg-[#252E4C]",
        },
      ];
      gameInfo = "S3 $661K Vol. · WTA Tour";
    } else if (qLower.includes("tirante") || qLower.includes("landaluce")) {
      teams = [
        {
          name: "T. Tirante",
          shortName: "T. Tirante",
          flag: "🇦🇷",
          scores: ["7", "3"],
          prob: 82,
          bgClass: "bg-[#242B36] text-[#E2E8F0] hover:bg-[#2F3745]",
        },
        {
          name: "M. Landaluce",
          shortName: "M. Land.",
          flag: "🇪🇸",
          scores: ["6", "3"],
          prob: 19,
          bgClass: "bg-[#33221A] text-[#FB923C] hover:bg-[#422C22]",
        },
      ];
      gameInfo = "S2 $621K Vol. · ATP Tour";
    } else if (qLower.includes("blockx") || qLower.includes("cobolli")) {
      teams = [
        {
          name: "A. Blockx",
          shortName: "A. Blockx",
          flag: "🇧🇪",
          scores: ["5", "6"],
          prob: 54,
          bgClass: "bg-[#2A2C1A] text-[#EAB308] hover:bg-[#383A23]",
        },
        {
          name: "F. Cobolli",
          shortName: "F. Cobolli",
          flag: "🇮🇹",
          scores: ["7", "4"],
          prob: 47,
          bgClass: "bg-[#331C1D] text-[#EF4444] hover:bg-[#442527]",
        },
      ];
      gameInfo = "S3 $424K Vol. · ATP Tour";
    } else if (qLower.includes("natus") || qLower.includes("heretics")) {
      teams = [
        {
          name: "Natus Vincere",
          shortName: "NAVI",
          logo: "🦅",
          prob: 70,
          bgClass: "bg-[#1E253D] text-[#818CF8] hover:bg-[#283252]",
        },
        {
          name: "Team Heretics",
          shortName: "Heretics",
          logo: "🛡️",
          prob: 31,
          bgClass: "bg-[#22311D] text-[#A3E635] hover:bg-[#2E4227]",
        },
      ];
      gameInfo = "LoL · 10:00 PM";
    } else if (qLower.includes("real madrid") || qLower.includes("manchester")) {
      teams = [
        {
          name: "Real Madrid",
          shortName: "Real Madrid",
          logo: "👑",
          prob: 54,
          bgClass: "bg-[#1E253D] text-[#818CF8] hover:bg-[#283252]",
        },
        {
          name: "Man City",
          shortName: "Man City",
          logo: "⚽",
          prob: 46,
          bgClass: "bg-[#162F22] text-[#22C55E] hover:bg-[#224535]",
        },
      ];
      gameInfo = "LIVE · Champions League";
    } else if (qLower.includes("hanjin") || qLower.includes("global academy")) {
      teams = [
        {
          name: "Gen.G Global Academy",
          shortName: "Gen.G",
          logo: "🏆",
          scores: ["1"],
          prob: 38,
          bgClass: "bg-[#33221A] text-[#FB923C] hover:bg-[#422C22]",
        },
        {
          name: "HANJIN BRION Challengers",
          shortName: "HANJIN",
          logo: "🦅",
          scores: ["1"],
          prob: 63,
          bgClass: "bg-[#162F22] text-[#22C55E] hover:bg-[#224535]",
        },
      ];
      gameInfo = "GAME 3 $520K Vol. · LoL";
    } else if (qLower.includes("t1") || qLower.includes("geng")) {
      teams = [
        {
          name: "T1 Esports",
          shortName: "T1",
          logo: "🏆",
          prob: 62,
          bgClass: "bg-[#2F1C24] text-[#F43F5E] hover:bg-[#3D2430]",
        },
        {
          name: "Gen.G",
          shortName: "Gen.G",
          logo: "🐯",
          prob: 38,
          bgClass: "bg-[#33221A] text-[#FB923C] hover:bg-[#422C22]",
        },
      ];
      gameInfo = "LCK Final · LoL";
    } else {
      const parts = m.question.split(/ vs\.? /i);
      teams = [
        {
          name: parts[0] || "Team A",
          shortName: parts[0]?.split(" ")[0] || "Team A",
          logo: "⚔️",
          prob: probYes,
          bgClass: "bg-[#1E253D] text-[#818CF8]",
        },
        {
          name: parts[1] || "Team B",
          shortName: parts[1]?.split(" ")[0] || "Team B",
          logo: "🛡️",
          prob: probNo,
          bgClass: "bg-[#22311D] text-[#A3E635]",
        },
      ];
      gameInfo = `${m.volume} Vol. · Live`;
    }
  }

  // Inner market detail
  const innerMarket: MarketDetail = {
    schemaVersion: "1",
    id: marketCanonicalId,
    eventId: eventCanonicalId,
    upstreamId: `polymarket-${m.id}`,
    conditionId: `0x${m.id}`,
    slug: m.id,
    question: m.question,
    description: m.description || `Predict the verified outcome for "${m.question}".`,
    status: "open",
    endAt: new Date(Date.now() + 60 * 86400000).toISOString(),
    image: resolvedImg.url,
    outcomes: [
      {
        id: `outcome-yes-${m.id}`,
        upstreamId: `token-yes-${m.id}`,
        name: "YES",
        price: yesPrice,
      },
      {
        id: `outcome-no-${m.id}`,
        upstreamId: `token-no-${m.id}`,
        name: "NO",
        price: noPrice,
      },
    ],
    capabilities: {
      orderBook: true,
      history: true,
      realtime: true,
      negRisk: false,
      trading: false,
    },
    resolution: {
      description:
        m.resolutionSource
          ? `Resolves based on official data from ${m.resolutionSource}.`
          : "Resolves according to verified UMA Optimistic Oracle & official reporting benchmarks.",
      sources: [
        {
          name: m.resolutionSource || "UMA Oracle & Polymarket Resolution",
          url: "https://docs.polymarket.com/",
        },
      ],
      contentHash: `resolution-hash-${m.id}`,
    },
    freshness: defaultFreshness,
    provenance: defaultProvenance,
  };

  return {
    schemaVersion: "1",
    id: eventCanonicalId,
    upstreamId: `polymarket-${m.id}`,
    slug: m.id,
    title: m.question,
    description: m.description || `Prediction market for ${m.question}`,
    status: "open",
    category: m.category,
    startAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 60 * 86400000).toISOString(),
    marketCount: m.options ? m.options.length : 2,
    imageUrl: resolvedImg.url,
    iconUrl: resolvedImg.url,
    image: resolvedImg.url,
    icon: m.icon,
    volume: m.volume,
    liquidity: m.liquidity,
    participants: m.participants,
    timeLeft: m.timeLeft,
    tags: m.tags || [m.category],
    trend: m.trend,
    chart: m.chart,
    cardType,
    teams,
    gameInfo,
    options: formattedOptions,
    accent: m.accent,
    rawMarket: m,
    freshness: defaultFreshness,
    provenance: defaultProvenance,
    markets: [innerMarket],
  };
}

// Convert entire MARKETS collection from retropickData
export const RETROPICK_ACCURATE_EVENTS: ExtendedEventDetail[] = MARKETS.map(marketToEventDetail);

export const MOCK_EVENTS: ExtendedEventDetail[] = RETROPICK_ACCURATE_EVENTS;

export const MOCK_EVENTS_LIST_RESPONSE: EventsListResponse = {
  schemaVersion: "1",
  events: RETROPICK_ACCURATE_EVENTS,
  cursor: null,
  page: {
    nextCursor: null,
    limit: RETROPICK_ACCURATE_EVENTS.length,
  },
  source: "retropick-live-feed",
  checkedAt: new Date().toISOString(),
  freshness: defaultFreshness,
  provenance: defaultProvenance,
};

export const MOCK_ORDERBOOK: OrderBookSnapshot = {
  schemaVersion: "1",
  marketId: "polymarket:market:btc-highest-ladder-yes",
  conditionId: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  tokenId: "token-yes-1",
  hash: "hash-orderbook-1",
  timestamp: new Date().toISOString(),
  bids: [
    { price: "0.64", size: "12500.00" },
    { price: "0.63", size: "8400.00" },
    { price: "0.62", size: "15900.00" },
  ],
  asks: [
    { price: "0.65", size: "9100.00" },
    { price: "0.66", size: "14800.00" },
    { price: "0.67", size: "22000.00" },
  ],
  bestBid: "0.64",
  bestAsk: "0.65",
  midpoint: "0.645",
  spread: "0.01",
  minOrderSize: "5.00",
  tickSize: "0.01",
  negRisk: false,
  lastTradePrice: "0.64",
  freshness: defaultFreshness,
  provenance: defaultProvenance,
};
