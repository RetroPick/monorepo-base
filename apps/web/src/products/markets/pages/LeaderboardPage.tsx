"use client";

import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Crown,
  Trophy,
  Search,
  Copy,
  Check,
  UserPlus,
  ArrowUpRight,
} from "lucide-react";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { walletProfilePath } from "../routes/paths";
import { cn } from "@/shared/lib/utils";

interface Trader {
  rank: number;
  wallet: string;
  pnlUsd: number;
  winRatePercent: number;
  totalVolumeUsd: string;
  topMarket: string;
  marketId: string;
}

interface WhaleTrade {
  id: string;
  wallet: string;
  marketTitle: string;
  marketId: string;
  side: "YES" | "NO";
  amountUsd: number;
  priceShares: number;
  timeAgo: string;
}

interface SmartMoneyTrader {
  rank: number;
  wallet: string;
  roi: string;
  winRate: string;
  volumeUsd: string;
  score: number;
}

const TOP_TRADERS: Trader[] = [
  {
    rank: 1,
    wallet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    pnlUsd: 185400,
    winRatePercent: 89.4,
    totalVolumeUsd: "$2.4M",
    topMarket: "Bitcoin $150K before Jan 2027",
    marketId: "btc-150k-2027",
  },
  {
    rank: 2,
    wallet: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
    pnlUsd: 142500,
    winRatePercent: 85.2,
    totalVolumeUsd: "$1.9M",
    topMarket: "NVIDIA $5T Market Cap 2026",
    marketId: "nvidia-market-cap-5t",
  },
  {
    rank: 3,
    wallet: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    pnlUsd: 118200,
    winRatePercent: 82.5,
    totalVolumeUsd: "$1.4M",
    topMarket: "Fed Decision in September: 25 bps cut?",
    marketId: "fed-decision-september",
  },
  {
    rank: 4,
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    pnlUsd: 96400,
    winRatePercent: 80.1,
    totalVolumeUsd: "$1.1M",
    topMarket: "SpaceX Starship Booster Mechazilla Catch",
    marketId: "spacex-starship-booster-catch",
  },
  {
    rank: 5,
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    pnlUsd: 84300,
    winRatePercent: 78.4,
    totalVolumeUsd: "$890K",
    topMarket: "OpenAI launches GPT-6 before Q4 2026",
    marketId: "openai-gpt6-2026",
  },
  {
    rank: 6,
    wallet: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
    pnlUsd: 73800,
    winRatePercent: 76.5,
    totalVolumeUsd: "$780K",
    topMarket: "Ethereum ETF Staking Approval by SEC",
    marketId: "eth-etf-staking-approval-2026",
  },
  {
    rank: 7,
    wallet: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    pnlUsd: 65200,
    winRatePercent: 74.8,
    totalVolumeUsd: "$690K",
    topMarket: "Strait of Hormuz normal traffic by Sep 30",
    marketId: "strait-of-hormuz-normal-sep",
  },
  {
    rank: 8,
    wallet: "0x28C6c06298d514Db089934071355E5743bf21d60",
    pnlUsd: 58900,
    winRatePercent: 73.2,
    totalVolumeUsd: "$590K",
    topMarket: "Solana reaches $500 in 2026",
    marketId: "solana-500-2026",
  },
  {
    rank: 9,
    wallet: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    pnlUsd: 52400,
    winRatePercent: 71.9,
    totalVolumeUsd: "$510K",
    topMarket: "Gold hits $3,000 / oz in 2026",
    marketId: "gold-3000-per-oz-2026",
  },
  {
    rank: 10,
    wallet: "0x503828976D22510aad0201ac7EC88293211D23Da",
    pnlUsd: 48100,
    winRatePercent: 70.5,
    totalVolumeUsd: "$480K",
    topMarket: "US Core CPI Inflation drops below 2.5%",
    marketId: "us-cpi-below-2-5-2026",
  },
  {
    rank: 11,
    wallet: "0x075e72a5703A4668decCe948D4B4c5f9486c00d4",
    pnlUsd: 43600,
    winRatePercent: 69.4,
    totalVolumeUsd: "$430K",
    topMarket: "FIFA World Cup 2026 Winner",
    marketId: "fifa-world-cup-2026-winner",
  },
  {
    rank: 12,
    wallet: "0x9c0438D112b339d332A78A033aeb685b5E69C11a",
    pnlUsd: 39800,
    winRatePercent: 68.2,
    totalVolumeUsd: "$390K",
    topMarket: "Anthropic Claude 4.5 release Q4 2026",
    marketId: "anthropic-claude-45-release",
  },
  {
    rank: 13,
    wallet: "0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990",
    pnlUsd: 36200,
    winRatePercent: 67.5,
    totalVolumeUsd: "$360K",
    topMarket: "Hyperliquid flips Binance Perps volume",
    marketId: "hyperliquid-volume-flip-2026",
  },
  {
    rank: 14,
    wallet: "0x6cC5F688a30d379E122C990e1493924B11E5c731",
    pnlUsd: 33400,
    winRatePercent: 66.8,
    totalVolumeUsd: "$330K",
    topMarket: "Dogecoin reaches $1.00 in 2026",
    marketId: "doge-1-dollar-2026",
  },
  {
    rank: 15,
    wallet: "0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6",
    pnlUsd: 30100,
    winRatePercent: 65.9,
    totalVolumeUsd: "$300K",
    topMarket: "Monad Mainnet 10k+ TPS Launch",
    marketId: "monad-mainnet-launch-2026",
  },
  {
    rank: 16,
    wallet: "0x220866B1A2219f40e72f5c628B65D54268cA3A9D",
    pnlUsd: 27800,
    winRatePercent: 65.1,
    totalVolumeUsd: "$280K",
    topMarket: "US National Debt passes $38 Trillion",
    marketId: "us-national-debt-38t-2026",
  },
  {
    rank: 17,
    wallet: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    pnlUsd: 25400,
    winRatePercent: 64.3,
    totalVolumeUsd: "$250K",
    topMarket: "Apple foldable iPhone Announcement",
    marketId: "apple-foldable-iphone-event",
  },
  {
    rank: 18,
    wallet: "0x3DdfA8eC30da2F391B6B2BE3aA7B6a7EcB3b1C67",
    pnlUsd: 23100,
    winRatePercent: 63.8,
    totalVolumeUsd: "$230K",
    topMarket: "Super Bowl LIX Chiefs 3-Peat",
    marketId: "super-bowl-lix-chiefs-3peat",
  },
  {
    rank: 19,
    wallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    pnlUsd: 21500,
    winRatePercent: 63.0,
    totalVolumeUsd: "$210K",
    topMarket: "Base L2 native token launch",
    marketId: "base-l2-native-token-2026",
  },
  {
    rank: 20,
    wallet: "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D",
    pnlUsd: 19800,
    winRatePercent: 62.4,
    totalVolumeUsd: "$195K",
    topMarket: "Bank of Japan rate hike above 0.75%",
    marketId: "boj-rate-hike-075-2026",
  },
  {
    rank: 21,
    wallet: "0x54BE499092d6e326b4859a16D34C9696b99734a1",
    pnlUsd: 18200,
    winRatePercent: 61.8,
    totalVolumeUsd: "$180K",
    topMarket: "T1 vs Gen.G LCK Championship",
    marketId: "t1-vs-geng",
  },
  {
    rank: 22,
    wallet: "0x9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    pnlUsd: 16700,
    winRatePercent: 61.2,
    totalVolumeUsd: "$165K",
    topMarket: "US Balance of Power 2026",
    marketId: "balance-of-power",
  },
  {
    rank: 23,
    wallet: "0x38490F83EFda4A62bEA58bCA984Eb79854C99188",
    pnlUsd: 15100,
    winRatePercent: 60.5,
    totalVolumeUsd: "$150K",
    topMarket: "Bitcoin hits $200k in 2027",
    marketId: "btc-150k-2027",
  },
  {
    rank: 24,
    wallet: "0xb794f5ea0ba39494ce839613fffba74279579268",
    pnlUsd: 13900,
    winRatePercent: 59.9,
    totalVolumeUsd: "$138K",
    topMarket: "Anthropic IPO by December 2026",
    marketId: "anthropic-ipo-2026",
  },
  {
    rank: 25,
    wallet: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
    pnlUsd: 12500,
    winRatePercent: 59.2,
    totalVolumeUsd: "$124K",
    topMarket: "Solana hits $500 in 2026",
    marketId: "solana-500-2026",
  },
];

const WHALE_TRADES: WhaleTrade[] = [
  {
    id: "wt-1",
    wallet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    marketTitle: "Will Bitcoin hit $150,000 before January 1, 2027?",
    marketId: "btc-150k-2027",
    side: "YES",
    amountUsd: 145000,
    priceShares: 64,
    timeAgo: "1m ago",
  },
  {
    id: "wt-2",
    wallet: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
    marketTitle: "Will NVIDIA reach $5 Trillion market cap in 2026?",
    marketId: "nvidia-market-cap-5t",
    side: "YES",
    amountUsd: 135000,
    priceShares: 77,
    timeAgo: "3m ago",
  },
  {
    id: "wt-3",
    wallet: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    marketTitle: "Fed Decision in September: 25 bps rate cut?",
    marketId: "fed-decision-september",
    side: "YES",
    amountUsd: 112000,
    priceShares: 71,
    timeAgo: "7m ago",
  },
  {
    id: "wt-4",
    wallet: "0x220866B1A2219f40e72f5c628B65D54268cA3A9D",
    marketTitle: "US Federal Debt passes $38 Trillion in 2026?",
    marketId: "us-national-debt-38t-2026",
    side: "YES",
    amountUsd: 110000,
    priceShares: 91,
    timeAgo: "12m ago",
  },
  {
    id: "wt-5",
    wallet: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
    marketTitle: "Ethereum ETF Staking Approval by SEC before End of 2026?",
    marketId: "eth-etf-staking-approval-2026",
    side: "YES",
    amountUsd: 94000,
    priceShares: 62,
    timeAgo: "16m ago",
  },
  {
    id: "wt-6",
    wallet: "0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990",
    marketTitle: "Hyperliquid daily volume flips dYdX and Binance Perps in 2026?",
    marketId: "hyperliquid-volume-flip-2026",
    side: "YES",
    amountUsd: 92000,
    priceShares: 67,
    timeAgo: "21m ago",
  },
  {
    id: "wt-7",
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    marketTitle: "OpenAI launches GPT-6 before Q4 2026?",
    marketId: "openai-gpt6-2026",
    side: "YES",
    amountUsd: 88500,
    priceShares: 49,
    timeAgo: "26m ago",
  },
  {
    id: "wt-8",
    wallet: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    marketTitle: "Gold hits $3,000 / oz in 2026?",
    marketId: "gold-3000-per-oz-2026",
    side: "YES",
    amountUsd: 83000,
    priceShares: 74,
    timeAgo: "32m ago",
  },
  {
    id: "wt-9",
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    marketTitle: "SpaceX Starship Booster Mechazilla Catch Success?",
    marketId: "spacex-starship-booster-catch",
    side: "YES",
    amountUsd: 76000,
    priceShares: 86,
    timeAgo: "39m ago",
  },
  {
    id: "wt-10",
    wallet: "0x503828976D22510aad0201ac7EC88293211D23Da",
    marketTitle: "US Core CPI Inflation drops below 2.5% in 2026?",
    marketId: "us-cpi-below-2-5-2026",
    side: "YES",
    amountUsd: 72000,
    priceShares: 58,
    timeAgo: "44m ago",
  },
  {
    id: "wt-11",
    wallet: "0x6cC5F688a30d379E122C990e1493924B11E5c731",
    marketTitle: "Will Dogecoin reach $1.00 in 2026?",
    marketId: "doge-1-dollar-2026",
    side: "NO",
    amountUsd: 68000,
    priceShares: 24,
    timeAgo: "51m ago",
  },
  {
    id: "wt-12",
    wallet: "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D",
    marketTitle: "Bank of Japan raises policy rate above 0.75% in 2026?",
    marketId: "boj-rate-hike-075-2026",
    side: "YES",
    amountUsd: 67000,
    priceShares: 54,
    timeAgo: "58m ago",
  },
  {
    id: "wt-13",
    wallet: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    marketTitle: "Strait of Hormuz traffic returns to normal by September 30?",
    marketId: "strait-of-hormuz-normal-sep",
    side: "NO",
    amountUsd: 64000,
    priceShares: 38,
    timeAgo: "1h ago",
  },
  {
    id: "wt-14",
    wallet: "0x3DdfA8eC30da2F391B6B2BE3aA7B6a7EcB3b1C67",
    marketTitle: "Super Bowl LIX Winner: Kansas City Chiefs 3-Peat?",
    marketId: "super-bowl-lix-chiefs-3peat",
    side: "YES",
    amountUsd: 59000,
    priceShares: 34,
    timeAgo: "1h ago",
  },
  {
    id: "wt-15",
    wallet: "0x28C6c06298d514Db089934071355E5743bf21d60",
    marketTitle: "Will Solana hit $500 in 2026?",
    marketId: "solana-500-2026",
    side: "YES",
    amountUsd: 58000,
    priceShares: 44,
    timeAgo: "2h ago",
  },
  {
    id: "wt-16",
    wallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    marketTitle: "Base L2 launches native token by December 2026?",
    marketId: "base-l2-native-token-2026",
    side: "NO",
    amountUsd: 53000,
    priceShares: 21,
    timeAgo: "2h ago",
  },
  {
    id: "wt-17",
    wallet: "0x075e72a5703A4668decCe948D4B4c5f9486c00d4",
    marketTitle: "Who will win the FIFA World Cup 2026?",
    marketId: "fifa-world-cup-2026-winner",
    side: "YES",
    amountUsd: 52000,
    priceShares: 38,
    timeAgo: "3h ago",
  },
  {
    id: "wt-18",
    wallet: "0x9c0438D112b339d332A78A033aeb685b5E69C11a",
    marketTitle: "Anthropic Claude 4.5 release before Q4 2026?",
    marketId: "anthropic-claude-45-release",
    side: "YES",
    amountUsd: 46000,
    priceShares: 82,
    timeAgo: "3h ago",
  },
  {
    id: "wt-19",
    wallet: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    marketTitle: "Will Apple announce foldable iPhone in September Event?",
    marketId: "apple-foldable-iphone-event",
    side: "NO",
    amountUsd: 41000,
    priceShares: 29,
    timeAgo: "4h ago",
  },
  {
    id: "wt-20",
    wallet: "0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6",
    marketTitle: "Monad Mainnet launches with 10k+ TPS by Q4 2026?",
    marketId: "monad-mainnet-launch-2026",
    side: "YES",
    amountUsd: 39500,
    priceShares: 68,
    timeAgo: "4h ago",
  },
  {
    id: "wt-21",
    wallet: "0x54BE499092d6e326b4859a16D34C9696b99734a1",
    marketTitle: "T1 vs Gen.G LCK Regional Final Winner?",
    marketId: "t1-vs-geng",
    side: "YES",
    amountUsd: 35000,
    priceShares: 54,
    timeAgo: "5h ago",
  },
  {
    id: "wt-22",
    wallet: "0x9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    marketTitle: "US Balance of Power: Senate Majority 2026?",
    marketId: "balance-of-power",
    side: "YES",
    amountUsd: 31000,
    priceShares: 49,
    timeAgo: "5h ago",
  },
  {
    id: "wt-23",
    wallet: "0x38490F83EFda4A62bEA58bCA984Eb79854C99188",
    marketTitle: "Will Bitcoin hit $150,000 before January 1, 2027?",
    marketId: "btc-150k-2027",
    side: "YES",
    amountUsd: 28500,
    priceShares: 64,
    timeAgo: "6h ago",
  },
  {
    id: "wt-24",
    wallet: "0xb794f5ea0ba39494ce839613fffba74279579268",
    marketTitle: "Anthropic IPO by December 31, 2026?",
    marketId: "anthropic-ipo-2026",
    side: "YES",
    amountUsd: 25000,
    priceShares: 58,
    timeAgo: "6h ago",
  },
  {
    id: "wt-25",
    wallet: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
    marketTitle: "Will Solana hit $500 in 2026?",
    marketId: "solana-500-2026",
    side: "YES",
    amountUsd: 22000,
    priceShares: 44,
    timeAgo: "7h ago",
  },
];

const SMART_MONEY: SmartMoneyTrader[] = [
  {
    rank: 1,
    wallet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    roi: "+185%",
    winRate: "89.4%",
    volumeUsd: "$2.4M",
    score: 99,
  },
  {
    rank: 2,
    wallet: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
    roi: "+162%",
    winRate: "85.2%",
    volumeUsd: "$1.9M",
    score: 97,
  },
  {
    rank: 3,
    wallet: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    roi: "+148%",
    winRate: "82.5%",
    volumeUsd: "$1.4M",
    score: 95,
  },
  {
    rank: 4,
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    roi: "+134%",
    winRate: "80.1%",
    volumeUsd: "$1.1M",
    score: 93,
  },
  {
    rank: 5,
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    roi: "+121%",
    winRate: "78.4%",
    volumeUsd: "$890K",
    score: 91,
  },
  {
    rank: 6,
    wallet: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
    roi: "+112%",
    winRate: "76.5%",
    volumeUsd: "$780K",
    score: 89,
  },
  {
    rank: 7,
    wallet: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    roi: "+104%",
    winRate: "74.8%",
    volumeUsd: "$690K",
    score: 88,
  },
  {
    rank: 8,
    wallet: "0x28C6c06298d514Db089934071355E5743bf21d60",
    roi: "+96%",
    winRate: "73.2%",
    volumeUsd: "$590K",
    score: 86,
  },
  {
    rank: 9,
    wallet: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    roi: "+89%",
    winRate: "71.9%",
    volumeUsd: "$510K",
    score: 85,
  },
  {
    rank: 10,
    wallet: "0x503828976D22510aad0201ac7EC88293211D23Da",
    roi: "+84%",
    winRate: "70.5%",
    volumeUsd: "$480K",
    score: 84,
  },
  {
    rank: 11,
    wallet: "0x075e72a5703A4668decCe948D4B4c5f9486c00d4",
    roi: "+79%",
    winRate: "69.4%",
    volumeUsd: "$430K",
    score: 82,
  },
  {
    rank: 12,
    wallet: "0x9c0438D112b339d332A78A033aeb685b5E69C11a",
    roi: "+75%",
    winRate: "68.2%",
    volumeUsd: "$390K",
    score: 81,
  },
  {
    rank: 13,
    wallet: "0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990",
    roi: "+71%",
    winRate: "67.5%",
    volumeUsd: "$360K",
    score: 80,
  },
  {
    rank: 14,
    wallet: "0x6cC5F688a30d379E122C990e1493924B11E5c731",
    roi: "+68%",
    winRate: "66.8%",
    volumeUsd: "$330K",
    score: 79,
  },
  {
    rank: 15,
    wallet: "0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6",
    roi: "+65%",
    winRate: "65.9%",
    volumeUsd: "$300K",
    score: 78,
  },
  {
    rank: 16,
    wallet: "0x220866B1A2219f40e72f5c628B65D54268cA3A9D",
    roi: "+62%",
    winRate: "65.1%",
    volumeUsd: "$280K",
    score: 77,
  },
  {
    rank: 17,
    wallet: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    roi: "+59%",
    winRate: "64.3%",
    volumeUsd: "$250K",
    score: 76,
  },
  {
    rank: 18,
    wallet: "0x3DdfA8eC30da2F391B6B2BE3aA7B6a7EcB3b1C67",
    roi: "+56%",
    winRate: "63.8%",
    volumeUsd: "$230K",
    score: 75,
  },
  {
    rank: 19,
    wallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    roi: "+53%",
    winRate: "63.0%",
    volumeUsd: "$210K",
    score: 74,
  },
  {
    rank: 20,
    wallet: "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D",
    roi: "+50%",
    winRate: "62.4%",
    volumeUsd: "$195K",
    score: 73,
  },
  {
    rank: 21,
    wallet: "0x54BE499092d6e326b4859a16D34C9696b99734a1",
    roi: "+48%",
    winRate: "61.8%",
    volumeUsd: "$180K",
    score: 72,
  },
  {
    rank: 22,
    wallet: "0x9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    roi: "+45%",
    winRate: "61.2%",
    volumeUsd: "$165K",
    score: 71,
  },
  {
    rank: 23,
    wallet: "0x38490F83EFda4A62bEA58bCA984Eb79854C99188",
    roi: "+43%",
    winRate: "60.5%",
    volumeUsd: "$150K",
    score: 70,
  },
  {
    rank: 24,
    wallet: "0xb794f5ea0ba39494ce839613fffba74279579268",
    roi: "+40%",
    winRate: "59.9%",
    volumeUsd: "$138K",
    score: 69,
  },
  {
    rank: 25,
    wallet: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
    roi: "+38%",
    winRate: "59.2%",
    volumeUsd: "$124K",
    score: 68,
  },
];

function shortWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function WalletBadge({ wallet }: { wallet: string }) {
  const hex = wallet.slice(2, 4).toUpperCase() || "0X";
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600/20 border border-blue-500/30 font-mono text-[9px] font-bold text-blue-400"
      aria-hidden="true"
    >
      {hex}
    </div>
  );
}

export function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab =
    rawTab === "whales"
      ? "whales"
      : rawTab === "smart_money"
      ? "smart_money"
      : "traders";

  const [searchQuery, setSearchQuery] = useState("");
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const toggleFollow = (wallet: string) => {
    setFollowing((prev) => ({ ...prev, [wallet]: !prev[wallet] }));
  };

  const copyToClipboard = (wallet: string) => {
    navigator.clipboard.writeText(wallet);
    setCopiedWallet(wallet);
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const handleTabChange = (tab: "traders" | "whales" | "smart_money") => {
    setSearchParams({ tab });
  };

  const filteredTraders = useMemo(() => {
    if (!searchQuery.trim()) return TOP_TRADERS;
    const q = searchQuery.trim().toLowerCase();
    return TOP_TRADERS.filter(
      (t) =>
        t.wallet.toLowerCase().includes(q) ||
        t.topMarket.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredWhales = useMemo(() => {
    if (!searchQuery.trim()) return WHALE_TRADES;
    const q = searchQuery.trim().toLowerCase();
    return WHALE_TRADES.filter(
      (w) =>
        w.wallet.toLowerCase().includes(q) ||
        w.marketTitle.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredSmartMoney = useMemo(() => {
    if (!searchQuery.trim()) return SMART_MONEY;
    const q = searchQuery.trim().toLowerCase();
    return SMART_MONEY.filter((s) => s.wallet.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <MarketsAppShell title="Intelligence - RetroPick">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Top Control Bar: Search Wallet + Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Left: Search Wallet Input Box */}
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallet address (0x...)"
              className="h-10 w-full rounded-xl border border-white/10 bg-[#0E1424] py-2 pl-10 pr-4 font-mono text-xs text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:bg-[#131B2E]"
            />
          </div>

          {/* Right: Tab Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("traders")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "traders"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
            >
              <Trophy className={cn("h-4 w-4", activeTab === "traders" ? "text-amber-400" : "text-slate-500")} />
              <span>Top Traders ({TOP_TRADERS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("whales")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "whales"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
            >
              <Zap className={cn("h-4 w-4", activeTab === "whales" ? "text-cyan-400" : "text-slate-500")} />
              <span>Whales ({WHALE_TRADES.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("smart_money")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "smart_money"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
            >
              <Crown className={cn("h-4 w-4", activeTab === "smart_money" ? "text-amber-300" : "text-slate-500")} />
              <span>Smart Money ({SMART_MONEY.length})</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: TOP TRADERS                                           */}
        {/* ============================================================ */}
        {activeTab === "traders" && (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1424]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-14">Rank</th>
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">PnL</th>
                    <th className="px-4 py-3">Win Rate</th>
                    <th className="px-4 py-3">Volume</th>
                    <th className="px-4 py-3">Top Market</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTraders.map((trader) => (
                    <tr
                      key={trader.wallet}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">
                        #{trader.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WalletBadge wallet={trader.wallet} />
                          <Link
                            to={walletProfilePath(trader.wallet)}
                            className="font-mono text-xs font-bold text-white hover:text-blue-400 transition-colors"
                            title={trader.wallet}
                          >
                            {shortWallet(trader.wallet)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(trader.wallet)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                            title="Copy address"
                          >
                            {copiedWallet === trader.wallet ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        +${trader.pnlUsd.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">
                        {trader.winRatePercent}%
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-300">
                        {trader.totalVolumeUsd}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/markets/m/${trader.marketId}`}
                          className="font-medium text-slate-300 hover:text-blue-400 transition-colors truncate max-w-[200px] block"
                        >
                          {trader.topMarket}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFollow(trader.wallet)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                            following[trader.wallet]
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/10 text-white hover:bg-blue-600",
                          )}
                        >
                          {following[trader.wallet] ? "Following" : "Follow"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: WHALE TRACKER                                         */}
        {/* ============================================================ */}
        {activeTab === "whales" && (
          <div className="space-y-2.5">
            {filteredWhales.map((trade) => (
              <div
                key={trade.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0E1424] p-3.5 transition-all hover:border-blue-500/30"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <WalletBadge wallet={trade.wallet} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={walletProfilePath(trade.wallet)}
                        className="font-mono text-xs font-bold text-blue-400 hover:underline"
                      >
                        {shortWallet(trade.wallet)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(trade.wallet)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                        title="Copy wallet"
                      >
                        {copiedWallet === trade.wallet ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">
                        · {trade.timeAgo}
                      </span>
                    </div>
                    <Link
                      to={`/markets/m/${trade.marketId}`}
                      className="text-xs font-semibold text-slate-200 hover:text-blue-300 line-clamp-1 mt-0.5 block"
                    >
                      {trade.marketTitle}
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-bold font-mono",
                      trade.side === "YES"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                    )}
                  >
                    {trade.side} @ {trade.priceShares}¢
                  </span>

                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-white">
                      ${trade.amountUsd.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">
                      USDC
                    </span>
                  </div>

                  <Link
                    to={`/markets/m/${trade.marketId}`}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-600/20 hover:text-white transition-colors"
                    title="View Market"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SMART MONEY                                           */}
        {/* ============================================================ */}
        {activeTab === "smart_money" && (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1424]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-14">Rank</th>
                    <th className="px-4 py-3">Smart Wallet</th>
                    <th className="px-4 py-3">ROI</th>
                    <th className="px-4 py-3">Win Rate</th>
                    <th className="px-4 py-3">Volume</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSmartMoney.map((row) => (
                    <tr
                      key={row.wallet}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">
                        #{row.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <WalletBadge wallet={row.wallet} />
                          <Link
                            to={walletProfilePath(row.wallet)}
                            className="font-mono text-xs font-bold text-blue-400 hover:underline"
                          >
                            {shortWallet(row.wallet)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(row.wallet)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                            title="Copy wallet"
                          >
                            {copiedWallet === row.wallet ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {row.roi}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        {row.winRate}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {row.volumeUsd}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400">
                        {row.score}/100
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFollow(row.wallet)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                            following[row.wallet]
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/10 text-white hover:bg-blue-600",
                          )}
                        >
                          {following[row.wallet] ? "Following" : "Follow"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MarketsAppShell>
  );
}

export default LeaderboardPage;
