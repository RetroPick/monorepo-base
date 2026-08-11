export type WhaleFeedItem = {
  id: string;
  wallet: string;
  market: string;
  side: "YES" | "NO";
  sizeUsd: string;
  timestamp: string;
};

export type SmartMoneyRow = {
  rank: number;
  wallet: string;
  roi: string;
  winRate: string;
  volumeUsd: string;
};

export const FIXTURE_WHALE_FEED: WhaleFeedItem[] = [
  {
    id: "wh-1",
    wallet: "0x7a3f…c891",
    market: "Will BTC exceed $100k by Dec 31?",
    side: "YES",
    sizeUsd: "42,500",
    timestamp: "2m ago",
  },
  {
    id: "wh-2",
    wallet: "0x2b91…44ea",
    market: "Fed rate cut in September?",
    side: "NO",
    sizeUsd: "18,200",
    timestamp: "8m ago",
  },
];

export const FIXTURE_SMART_MONEY: SmartMoneyRow[] = [
  { rank: 1, wallet: "0x7a3f…c891", roi: "+124%", winRate: "68%", volumeUsd: "$1.2M" },
  { rank: 2, wallet: "0x2b91…44ea", roi: "+89%", winRate: "61%", volumeUsd: "$840K" },
  { rank: 3, wallet: "0x9c04…11ab", roi: "+72%", winRate: "58%", volumeUsd: "$620K" },
];

export const FIXTURE_PAPER_BALANCE = "$10,000";

export const FIXTURE_FOLLOWING = ["0x7a3f…c891", "0x2b91…44ea"];
