import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import {
  useAccount,
  useBalance,
  useReadContracts,
  useSignMessage,
  useSignTypedData,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Loader2, Wallet } from "lucide-react";
import { formatUnits } from "viem";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ABIS, CONTRACT_ADDRESSES, getContractAddresses } from "@/contracts/config";
import { DEPLOYMENT_CHAIN_ID } from "@/config/chains";
import { STAKE_TOKEN_SYMBOL } from "@/config/tokens";
import { useIndexerWebSocket } from "@/hooks/useIndexerWebSocket";
import {
  apiErrorSummary,
  fetchFaucetRelay,
  fetchFaucetState,
  fetchHealth,
  fetchMarkets,
  fetchMarketOutcomes,
  fetchPortfolioSummary,
  fetchRegistryContracts,
  fetchUserClaims,
  fetchUserEvents,
  fetchUserPositions,
  fetchUserWatchlist,
  fetchWatchlistNonce,
  postWatchlistMutate,
  type MarketRow,
  type OutcomeView,
} from "@/lib/api/retropickApi";

import { CategoryDistributionCard } from "@/features/portfolio/CategoryDistributionCard";
import { NetWorthCard, type NetWorthTimeframe } from "@/features/portfolio/NetWorthCard";
import { PortfolioOverviewCard } from "@/features/portfolio/PortfolioOverviewCard";
import {
  PortfolioTradingPanel,
  type EnrichedPositionRow,
  type PortfolioMainTab,
  type PortfolioSubTab,
  type WatchlistPanelSub,
} from "@/features/portfolio/PortfolioTradingPanel";
import { formatSignedStakeUsd, formatStakeUsd, parseStakeRaw, sumNumericStringKey } from "@/features/portfolio/formatStakeUsd";
import { openAppKitModal } from "@/lib/openAppKitModal";
import { buildWatchlistImportSignMessage, defaultWatchlistChainId } from "@/lib/watchlistSign";
import {
  buildCategorySlices,
  sumClaimProfits,
  sumEventVolume,
} from "@/features/portfolio/portfolioBuckets";
import {
  dominantOutcomeIndex,
  formatImpliedPercent,
  outcomeLabelForIndex,
  parseStakesArray,
} from "@/features/portfolio/positionMath";
import { clearLocalWatchlist, readWatchlist } from "@/features/portfolio/watchlistStorage";
import { buildFaucetMintSignRequest } from "@/lib/faucetTypedData";

const BASE_SEPOLIA_ETH_FAUCETS = [
  { label: "Coinbase", href: "https://portal.cdp.coinbase.com/products/faucet?token=ETH&network=base-sepolia" },
  { label: "Alchemy", href: "https://www.alchemy.com/faucets/base-sepolia" },
] as const;

const OUTCOME_ENRICH_CAP = 12;

function asAddress(value: unknown): `0x${string}` | undefined {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value as `0x${string}`)
    : undefined;
}

function asBigInt(value: unknown): bigint | undefined {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  const raw = asBigInt(value);
  if (raw === undefined || raw > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
  return Number(raw);
}

function tupleValue(value: unknown, index: number, key: string): unknown {
  if (Array.isArray(value)) return value[index];
  if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
  return undefined;
}

function formatUnixTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function faucetErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (/Cooldown|cooldown/i.test(message)) return fallback;
  if (/AmountTooLarge/i.test(message)) return "Requested amount is above this faucet's max mint amount.";
  if (/ZeroAmount/i.test(message)) return "Faucet amount must be greater than zero.";
  if (/insufficient funds|exceeds balance|not enough|gas/i.test(message)) {
    return "Wallet has no Base Sepolia ETH to pay gas. Claim Base Sepolia ETH first, then claim stake tokens.";
  }
  if (/mint/i.test(message)) return "Mock stake token mint failed. Check wallet network and gas.";
  if (/User rejected|rejected/i.test(message)) return "Wallet rejected the faucet request.";
  return message || "Could not request test tokens.";
}

function gasBalanceLabel(value: bigint | undefined, decimals: number | undefined): string {
  if (value === undefined || decimals === undefined) return "-";
  const n = Number(formatUnits(value, decimals));
  return Number.isFinite(n) ? `${n.toFixed(6)} ETH` : "-";
}

export function PortfolioPage() {
  const { address, isConnected, chainId } = useAccount();
  const readWalletAddress = address ?? "0x0000000000000000000000000000000000000000";
  const [searchParams, setSearchParams] = useSearchParams();
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const [timeframe, setTimeframe] = useState<NetWorthTimeframe>("7d");
  const [mainTab, setMainTab] = useState<PortfolioMainTab>("trades");
  const [subTab, setSubTab] = useState<PortfolioSubTab>("position");
  const [watchlistPanel, setWatchlistPanel] = useState<WatchlistPanelSub>("markets");
  const [hideSmallPositions, setHideSmallPositions] = useState(false);
  const [faucetRelayPending, setFaucetRelayPending] = useState(false);
  const watchlistMigrationDoneRef = useRef(false);

  const qc = useQueryClient();
  const { toast } = useToast();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { signTypedDataAsync, isPending: isFaucetSignPending } = useSignTypedData();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, data: faucetTxHash, isPending: isFaucetWritePending } = useWriteContract();
  const { isLoading: isFaucetConfirming, isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({
    hash: faucetTxHash,
    chainId: DEPLOYMENT_CHAIN_ID,
  });

  const gasBalanceQ = useBalance({
    address,
    chainId: DEPLOYMENT_CHAIN_ID,
    query: { enabled: Boolean(address), staleTime: 10_000 },
  });

  useIndexerWebSocket(!!address);

  const healthQ = useQuery({
    queryKey: ["retropick-api", "health"],
    queryFn: fetchHealth,
    staleTime: 5_000,
  });

  const marketsQ = useQuery({
    queryKey: ["retropick-api", "markets"],
    queryFn: fetchMarkets,
    staleTime: 30_000,
  });

  const registryQ = useQuery({
    queryKey: ["retropick-api", "registry-contracts"],
    queryFn: fetchRegistryContracts,
    staleTime: 3600_000,
  });

  const positionsQ = useQuery({
    queryKey: ["retropick-api", "user-positions", address],
    queryFn: () => fetchUserPositions(address!),
    enabled: Boolean(address),
  });

  const claimsQ = useQuery({
    queryKey: ["retropick-api", "user-claims", address],
    queryFn: () => fetchUserClaims(address!),
    enabled: Boolean(address),
  });

  const eventsQ = useQuery({
    queryKey: ["retropick-api", "user-events", address],
    queryFn: () => fetchUserEvents(address!, 100),
    enabled: Boolean(address),
    staleTime: 8_000,
  });

  const portfolioSummaryQ = useQuery({
    queryKey: ["retropick-api", "portfolio-summary", address],
    queryFn: () => fetchPortfolioSummary(address!),
    enabled: Boolean(address),
    staleTime: 12_000,
  });

  const watchlistQ = useQuery({
    queryKey: ["retropick-api", "user-watchlist", address],
    queryFn: () => fetchUserWatchlist(address!),
    enabled: Boolean(address),
    staleTime: 15_000,
  });

  const faucetQ = useQuery({
    queryKey: ["retropick-api", "faucet-state", address],
    queryFn: () => fetchFaucetState(address!),
    enabled: Boolean(address),
    staleTime: 15_000,
  });

  const lastSync = healthQ.data?.lastSyncAt ?? positionsQ.data?.dataFreshness?.lastSyncAt;
  const posRows = useMemo(
    () => (positionsQ.data?.positions ?? []) as Record<string, unknown>[],
    [positionsQ.data?.positions],
  );
  const validPos = useMemo(() => posRows.filter((p) => !p.error), [posRows]);
  const enrichSource = useMemo(() => validPos.slice(0, OUTCOME_ENRICH_CAP), [validPos]);

  const outcomeQueries = useQueries({
    queries: enrichSource.map((p) => {
      const tid = typeof p.templateId === "string" ? p.templateId : "";
      const eid = p.epochId;
      return {
        queryKey: ["retropick-api", "market-outcomes-portfolio", tid, eid],
        queryFn: () => fetchMarketOutcomes(tid, Number(eid)),
        enabled: Boolean(address && tid && eid != null && Number.isFinite(Number(eid))),
        staleTime: 10_000,
      };
    }),
  });

  const marketsByTemplate = useMemo(() => {
    const map = new Map<string, MarketRow>();
    for (const row of marketsQ.data ?? []) {
      map.set(row.templateId.toLowerCase(), row);
    }
    return map;
  }, [marketsQ.data]);

  const outcomeByKey = useMemo(() => {
    const m = new Map<string, OutcomeView[]>();
    enrichSource.forEach((p, i) => {
      const tid = typeof p.templateId === "string" ? p.templateId : "";
      const eid = p.epochId;
      const key = `${tid.toLowerCase()}:${eid}`;
      const data = outcomeQueries[i]?.data;
      if (data) m.set(key, data);
    });
    return m;
  }, [enrichSource, outcomeQueries]);

  const summaryUnrealizedByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of portfolioSummaryQ.data?.positions ?? []) {
      if (!row.templateId || row.epochId == null || row.error) continue;
      const key = `${row.templateId.toLowerCase()}:${row.epochId}`;
      if (typeof row.unrealizedPnlWei === "string") m.set(key, row.unrealizedPnlWei);
    }
    return m;
  }, [portfolioSummaryQ.data?.positions]);

  const explorerTxBase = registryQ.data?.explorers?.basescan ?? "https://sepolia.basescan.org";

  const enrichedPositions: EnrichedPositionRow[] = useMemo(() => {
    return posRows.map((position) => {
      if (position.error) {
        const tid = typeof position.templateId === "string" ? position.templateId : "";
        const epochId = Number(position.epochId ?? 0);
        return {
          key: `${tid}-${epochId}-err`,
          outcome: "Sync error",
          marketLine: String(position.error),
          shares: "—",
          marketValue: "—",
          avgCost: "—",
          lastPrice: "—",
          unrealizedPnl: "—",
          templateId: tid,
          dominantRaw: 0n,
        };
      }
      const tid = typeof position.templateId === "string" ? position.templateId : "";
      const epochId = Number(position.epochId ?? 0);
      const row = tid ? marketsByTemplate.get(tid.toLowerCase()) : undefined;
      const slug = row?.slug ?? tid.slice(0, 12) + (tid.length > 12 ? "…" : "");
      const stakes = parseStakesArray(position);
      const idx = dominantOutcomeIndex(stakes);
      const outcomeCount = row?.outcomeCount ?? stakes.length ?? 2;
      const outcome = outcomeLabelForIndex(row, idx, outcomeCount);
      const dominantRaw = stakes[idx] ?? 0n;
      const totalStake = sumNumericStringKey([position], "totalStake");
      const oKey = `${tid.toLowerCase()}:${position.epochId}`;
      const outcomes = outcomeByKey.get(oKey);
      const ov = outcomes?.find((o) => o.outcomeIndex === idx);
      const lastPrice = formatImpliedPercent(ov?.impliedProbabilityE6);
      const weiStr = summaryUnrealizedByKey.get(oKey);
      let unrealizedPnl = "—";
      if (weiStr !== undefined && /^-?\d+$/.test(weiStr)) {
        unrealizedPnl = formatSignedStakeUsd(BigInt(weiStr));
      } else {
        const pending = parseStakeRaw(position.pendingClaimAmount);
        if (pending !== undefined && pending > 0n) {
          unrealizedPnl = `+${formatStakeUsd(pending)}`;
        }
      }
      return {
        key: `${tid}-${epochId}`,
        outcome,
        marketLine: slug,
        shares: formatStakeUsd(dominantRaw),
        marketValue: formatStakeUsd(totalStake),
        avgCost: "—",
        lastPrice,
        unrealizedPnl,
        templateId: tid,
        dominantRaw,
      };
    });
  }, [posRows, marketsByTemplate, outcomeByKey, summaryUnrealizedByKey]);

  const pendingClaimTotal = useMemo(() => sumNumericStringKey(validPos, "pendingClaimAmount"), [validPos]);
  const totalStakeAll = useMemo(() => sumNumericStringKey(validPos, "totalStake"), [validPos]);
  const netWorthRaw = pendingClaimTotal + totalStakeAll;
  const volumeRaw = useMemo(() => sumEventVolume(eventsQ.data ?? []), [eventsQ.data]);
  const profitRaw = useMemo(() => sumClaimProfits(claimsQ.data?.claims ?? []), [claimsQ.data?.claims]);
  const categorySlices = useMemo(
    () => buildCategorySlices(validPos, marketsByTemplate),
    [validPos, marketsByTemplate],
  );

  const watchlistIds = useMemo(() => watchlistQ.data?.templateIds ?? [], [watchlistQ.data?.templateIds]);

  useEffect(() => {
    if (!address || !watchlistQ.isSuccess || watchlistMigrationDoneRef.current) return;
    const local = readWatchlist(address);
    const server = watchlistQ.data?.templateIds ?? [];
    if (local.length === 0 || server.length > 0) {
      watchlistMigrationDoneRef.current = true;
      return;
    }
    watchlistMigrationDoneRef.current = true;
    void (async () => {
      try {
        const { nonce } = await fetchWatchlistNonce(address);
        const deadline = Math.floor(Date.now() / 1000) + 14 * 60;
        const sorted = [...local]
          .map((x) => {
            const t = x.trim();
            return (t.startsWith("0x") ? t : `0x${t}`).toLowerCase();
          })
          .sort();
        const message = buildWatchlistImportSignMessage(defaultWatchlistChainId(), address, sorted, deadline, nonce);
        const signature = await signMessageAsync({ message, account: address });
        await postWatchlistMutate({
          wallet: address,
          action: "import",
          templateIds: sorted,
          deadline,
          nonce,
          signature,
        });
        clearLocalWatchlist(address);
        void qc.invalidateQueries({ queryKey: ["retropick-api", "user-watchlist"] });
        void qc.invalidateQueries({ queryKey: ["retropick-api", "portfolio-summary"] });
      } catch {
        watchlistMigrationDoneRef.current = false;
      }
    })();
  }, [address, qc, signMessageAsync, watchlistQ.data?.templateIds, watchlistQ.isSuccess]);
  const watchlistLabels = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of watchlistIds) {
      const row = marketsByTemplate.get(id.toLowerCase());
      m.set(id, row?.slug ?? id);
    }
    return m;
  }, [watchlistIds, marketsByTemplate]);

  const writeSectionParam = useCallback(
    (opts: { main: PortfolioMainTab; sub?: PortfolioSubTab; watch?: WatchlistPanelSub }) => {
      const params = new URLSearchParams(searchParams);
      if (opts.main === "watchlist") {
        const w = opts.watch ?? watchlistPanel;
        params.set("section", w === "activity" ? "watchlist_activity" : "watchlist");
      } else {
        const sub = opts.sub ?? subTab;
        if (sub === "transactions") params.set("section", "activity");
        else if (sub === "resolution") params.set("section", "resolution");
        else if (sub === "position") params.set("section", "positions");
        else params.delete("section");
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, subTab, watchlistPanel],
  );

  const syncSectionFromUrl = useCallback(() => {
    const section = searchParams.get("section");
    if (!section) return;

    if (section === "watchlist") {
      setMainTab("watchlist");
      setWatchlistPanel("markets");
    } else if (section === "watchlist_activity") {
      setMainTab("watchlist");
      setWatchlistPanel("activity");
    } else if (section === "activity") {
      setMainTab("trades");
      setSubTab("transactions");
    } else if (section === "resolution") {
      setMainTab("trades");
      setSubTab("resolution");
    } else if (section === "positions") {
      setMainTab("trades");
      setSubTab("position");
    } else if (section === "transactions") {
      setMainTab("trades");
      setSubTab("transactions");
      const params = new URLSearchParams(searchParams);
      params.set("section", "activity");
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    syncSectionFromUrl();
  }, [syncSectionFromUrl]);

  const handleMainTab = useCallback(
    (t: PortfolioMainTab) => {
      setMainTab(t);
      writeSectionParam({ main: t });
    },
    [writeSectionParam],
  );

  const handleSubTab = useCallback(
    (t: PortfolioSubTab) => {
      setSubTab(t);
      writeSectionParam({ main: "trades", sub: t });
    },
    [writeSectionParam],
  );

  const handleWatchlistPanel = useCallback(
    (w: WatchlistPanelSub) => {
      setWatchlistPanel(w);
      writeSectionParam({ main: "watchlist", watch: w });
    },
    [writeSectionParam],
  );

  const faucet = faucetQ.data;
  const registryContracts = getContractAddresses(DEPLOYMENT_CHAIN_ID);
  const faucetAddress = asAddress(faucet?.tokenFaucet) ?? CONTRACT_ADDRESSES.Faucet;
  const stakeTokenAddress = asAddress(faucet?.stakeToken) ?? registryContracts.stakeToken;
  const faucetRelayEnabled = registryQ.data?.faucetRelayEnabled === true;

  const faucetReadsQ = useReadContracts({
    allowFailure: true,
    contracts: [
      {
        address: faucetAddress,
        abi: ABIS.TokenFaucet,
        functionName: "config",
        chainId: DEPLOYMENT_CHAIN_ID,
      },
      {
        address: faucetAddress,
        abi: ABIS.TokenFaucet,
        functionName: "lastMintAt",
        args: [readWalletAddress],
        chainId: DEPLOYMENT_CHAIN_ID,
      },
      {
        address: faucetAddress,
        abi: ABIS.TokenFaucet,
        functionName: "nonces",
        args: [readWalletAddress],
        chainId: DEPLOYMENT_CHAIN_ID,
      },
      {
        address: stakeTokenAddress,
        abi: ABIS.ERC20,
        functionName: "decimals",
        chainId: DEPLOYMENT_CHAIN_ID,
      },
      {
        address: stakeTokenAddress,
        abi: ABIS.ERC20,
        functionName: "balanceOf",
        args: [readWalletAddress],
        chainId: DEPLOYMENT_CHAIN_ID,
      },
    ],
    query: {
      enabled: Boolean(address && faucetAddress && stakeTokenAddress),
      staleTime: 10_000,
    },
  });

  const faucetConfig = faucetReadsQ.data?.[0]?.status === "success" ? faucetReadsQ.data[0].result : undefined;
  const onchainCooldownSeconds = asNumber(tupleValue(faucetConfig, 0, "cooldownSeconds"));
  const onchainMaxMintAmount = asBigInt(tupleValue(faucetConfig, 1, "maxMintAmount"));
  const onchainLastMintAt =
    faucetReadsQ.data?.[1]?.status === "success" ? asNumber(faucetReadsQ.data[1].result) : undefined;
  const onchainFaucetNonce =
    faucetReadsQ.data?.[2]?.status === "success" ? asBigInt(faucetReadsQ.data[2].result) : undefined;
  const onchainDecimals =
    faucetReadsQ.data?.[3]?.status === "success" ? asNumber(faucetReadsQ.data[3].result) : undefined;
  const onchainBalance =
    faucetReadsQ.data?.[4]?.status === "success" ? asBigInt(faucetReadsQ.data[4].result) : undefined;
  const hasOnchainFaucetState =
    onchainBalance !== undefined || onchainDecimals !== undefined || onchainMaxMintAmount !== undefined;
  const faucetDecimals = onchainDecimals ?? faucet?.stakeTokenDecimals ?? 18;
  const canUseFaucet =
    isConnected && (faucet?.chainId === undefined || faucet.chainId === DEPLOYMENT_CHAIN_ID) && Boolean(faucetAddress);
  const backendMaxMintAmount = asBigInt(faucet?.maxMintAmount);
  const faucetAmount = onchainMaxMintAmount ?? backendMaxMintAmount ?? 1_000n * 10n ** BigInt(faucetDecimals);
  const nextFaucetClaimAt =
    typeof onchainLastMintAt === "number" && typeof onchainCooldownSeconds === "number"
      ? onchainLastMintAt + onchainCooldownSeconds
      : typeof faucet?.lastMintAt === "number" && typeof faucet?.cooldownSeconds === "number"
        ? faucet.lastMintAt + faucet.cooldownSeconds
        : 0;
  const faucetCooldownSeconds = nextFaucetClaimAt > nowSeconds ? nextFaucetClaimAt - nowSeconds : 0;
  const faucetConfigLoading = isConnected && faucetReadsQ.isLoading && faucetAmount === undefined;
  const faucetCooldownText =
    faucetCooldownSeconds > 0
      ? `Faucet cooldown active. Try again at ${formatUnixTime(nextFaucetClaimAt)}.`
      : "";
  const nativeGasBalance = gasBalanceQ.data?.value;
  const needsBaseSepoliaGas =
    isConnected && chainId === DEPLOYMENT_CHAIN_ID && nativeGasBalance !== undefined && nativeGasBalance === 0n;
  const faucetBusy =
    isSwitchingChain ||
    isFaucetWritePending ||
    isFaucetConfirming ||
    faucetRelayPending ||
    isFaucetSignPending;
  let faucetLabel = "Add Funds";
  if (!isConnected) {
    faucetLabel = "Connect wallet";
  } else if (chainId !== DEPLOYMENT_CHAIN_ID) {
    faucetLabel = "Switch to Base Sepolia";
  } else if (isFaucetSignPending) {
    faucetLabel = "Sign in wallet";
  } else if (faucetRelayPending) {
    faucetLabel = "Submitting claim…";
  } else if (isFaucetWritePending) {
    faucetLabel = "Confirm in wallet";
  } else if (isFaucetConfirming) {
    faucetLabel = "Confirm pending";
  } else if (faucetConfigLoading) {
    faucetLabel = "Loading";
  } else if (needsBaseSepoliaGas && !faucetRelayEnabled) {
    faucetLabel = "Need Base Sepolia ETH";
  }

  useEffect(() => {
    if (faucetCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [faucetCooldownSeconds]);

  useEffect(() => {
    if (!isFaucetSuccess || !address) return;
    toast({
      title: "Balance updated",
      description: "Stake token mint confirmed. Refreshing balances.",
    });
    void faucetReadsQ.refetch();
    void gasBalanceQ.refetch();
    void qc.invalidateQueries({ queryKey: ["retropick-api", "faucet-state", address] });
    void qc.invalidateQueries({ queryKey: ["retropick-api", "user-positions", address] });
    void qc.invalidateQueries({ queryKey: ["retropick-api", "portfolio-summary", address] });
    void qc.invalidateQueries({ queryKey: ["retropick-api", "user-watchlist", address] });
  }, [address, faucetReadsQ, gasBalanceQ, isFaucetSuccess, qc, toast]);

  const handleFaucetClaim = async () => {
    if (!address) return;
    try {
      if (chainId !== DEPLOYMENT_CHAIN_ID) {
        await switchChainAsync({ chainId: DEPLOYMENT_CHAIN_ID });
        return;
      }
      if (!canUseFaucet || !faucetAddress) {
        toast({
          title: "Faucet unavailable",
          description: "No Base Sepolia faucet address is configured.",
          variant: "destructive",
        });
        return;
      }
      if (faucetAmount === undefined || faucetAmount <= 0n) {
        toast({
          title: "Faucet unavailable",
          description: "Could not read max mint from chain.",
          variant: "destructive",
        });
        return;
      }

      if (faucetRelayEnabled) {
        const mintNonce =
          onchainFaucetNonce ??
          (typeof faucet?.nonce === "string" && /^\d+$/.test(faucet.nonce) ? BigInt(faucet.nonce) : undefined);
        if (mintNonce === undefined) {
          toast({
            title: "Faucet unavailable",
            description: "Could not read signature nonce from chain.",
            variant: "destructive",
          });
          return;
        }
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
        const signReq = buildFaucetMintSignRequest({
          chainId: DEPLOYMENT_CHAIN_ID,
          faucetAddress: faucetAddress as `0x${string}`,
          recipient: address as `0x${string}`,
          amount: faucetAmount,
          nonce: mintNonce,
          deadline,
        });
        const signature = await signTypedDataAsync(
          signReq as unknown as Parameters<typeof signTypedDataAsync>[0],
        );
        setFaucetRelayPending(true);
        try {
          const { txHash } = await fetchFaucetRelay({
            recipient: address,
            amount: faucetAmount.toString(),
            deadline: Number(deadline),
            signature: signature as `0x${string}`,
          });
          toast({
            title: "Gasless faucet submitted",
            description: `Tx ${txHash.slice(0, 10)}… — balances will update shortly.`,
          });
          void faucetReadsQ.refetch();
          void gasBalanceQ.refetch();
          void qc.invalidateQueries({ queryKey: ["retropick-api", "faucet-state", address] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "user-positions", address] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "portfolio-summary", address] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "user-watchlist", address] });
        } finally {
          setFaucetRelayPending(false);
        }
        return;
      }

      if (nativeGasBalance !== undefined && nativeGasBalance === 0n) {
        toast({
          title: "Need Base Sepolia ETH",
          description: "Minting needs gas. Claim Base Sepolia ETH first.",
          variant: "destructive",
        });
        return;
      }

      await writeContractAsync({
        address: faucetAddress,
        abi: ABIS.TokenFaucet,
        functionName: "request",
        args: [faucetAmount],
        chainId: DEPLOYMENT_CHAIN_ID,
      } as unknown as Parameters<typeof writeContractAsync>[0]);
    } catch (error) {
      toast({
        title: "Mint failed",
        description: faucetErrorMessage(error, faucetCooldownText),
        variant: "destructive",
      });
    }
  };

  const balanceRaw =
    onchainBalance ??
    (typeof faucet?.stakeTokenBalance === "string" && /^\d+$/.test(faucet.stakeTokenBalance)
      ? BigInt(faucet.stakeTokenBalance)
      : undefined);

  const testnetNote =
    isConnected && chainId === DEPLOYMENT_CHAIN_ID ? (
      <span>
        Testnet faucet mints {STAKE_TOKEN_SYMBOL}. Balance {formatStakeUsd(balanceRaw)} · Gas{" "}
        {gasBalanceLabel(gasBalanceQ.data?.value, gasBalanceQ.data?.decimals)}
        {faucetCooldownText ? ` · ${faucetCooldownText}` : ""}
        {faucetQ.isError && !hasOnchainFaucetState ? ` · API ${apiErrorSummary(faucetQ.error)}` : ""}
      </span>
    ) : null;

  const gasLinks =
    needsBaseSepoliaGas && isConnected && !faucetRelayEnabled ? (
      <span className="font-semibold text-amber-700 dark:text-amber-300">
        Gas required:{" "}
        {BASE_SEPOLIA_ETH_FAUCETS.map((item, index) => (
          <span key={item.href}>
            {index > 0 ? " · " : ""}
            <a href={item.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {item.label}
            </a>
          </span>
        ))}
      </span>
    ) : null;

  const eventsRows = eventsQ.data ?? [];
  const claimsRows = claimsQ.data?.claims ?? [];
  const aggUn = portfolioSummaryQ.data?.aggregate.unrealizedPnlWei;
  const unrealizedPnlLabel = !isConnected
    ? "$0.00"
    : aggUn !== undefined && /^-?\d+$/.test(aggUn)
      ? formatSignedStakeUsd(BigInt(aggUn))
      : pendingClaimTotal > 0n
        ? `+${formatStakeUsd(pendingClaimTotal)}`
        : "—";
  const realizedWei = portfolioSummaryQ.data?.aggregate.realizedPnlClaimsWei;
  const profitSignedLabel = !isConnected
    ? "$0.00"
    : realizedWei !== undefined && /^-?\d+$/.test(realizedWei)
      ? formatSignedStakeUsd(BigInt(realizedWei))
      : profitRaw > 0n
        ? `+${formatStakeUsd(profitRaw)}`
        : formatStakeUsd(profitRaw);
  const refNetWei = portfolioSummaryQ.data?.aggregate.referenceNetStakeWei;
  const netWorthDisplayLabel =
    isConnected && refNetWei !== undefined && /^-?\d+$/.test(refNetWei)
      ? formatStakeUsd(BigInt(refNetWei))
      : isConnected
        ? formatStakeUsd(netWorthRaw)
        : "$0.00";
  const profitPositive =
    !isConnected ||
    (realizedWei !== undefined && /^-?\d+$/.test(realizedWei) ? BigInt(realizedWei) >= 0n : profitRaw >= 0n);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <Header />

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 min-h-0 flex-col gap-2 overflow-x-clip overflow-y-auto px-5 pb-20 pt-4 lg:overflow-hidden lg:px-10">
        {!isConnected ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 dark:border-white/[0.1] dark:bg-white/[0.03]">
            <Wallet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              Connect a wallet to load positions and balances. Use <strong className="text-foreground">Connect Wallet</strong> in the
              header, or open the wallet modal below.
            </p>
            <Button
              type="button"
              variant="default"
              onClick={() => void openAppKitModal()}
              className="h-10 shrink-0 px-5 text-sm font-semibold transition-colors hover:brightness-110"
            >
              Connect wallet
            </Button>
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col gap-1 text-[11px] leading-tight text-muted-foreground">
          {isConnected && lastSync ? (
            <p>
              Indexer sync: <span className="font-mono text-foreground">{String(lastSync)}</span>
            </p>
          ) : null}
          {positionsQ.isError ? (
            <p className="text-amber-600 dark:text-amber-400">
              Positions unavailable: <code className="text-[10px]">{apiErrorSummary(positionsQ.error)}</code>
            </p>
          ) : null}
          {portfolioSummaryQ.isError ? (
            <p className="text-amber-600 dark:text-amber-400">
              Portfolio summary unavailable: <code className="text-[10px]">{apiErrorSummary(portfolioSummaryQ.error)}</code>
            </p>
          ) : null}
          {marketsQ.isLoading ? (
            <p className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading market metadata…
            </p>
          ) : null}
        </div>

        <section className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm dark:border-white/[0.08]">
          <div className="grid shrink-0 grid-cols-1 divide-y divide-border/50 lg:grid-cols-12 lg:divide-x lg:divide-y-0 lg:divide-border/50 dark:divide-white/[0.08]">
            <div className="px-4 py-4 lg:col-span-3 lg:py-5">
              <PortfolioOverviewCard
                surface="plain"
                totalValueLabel={netWorthDisplayLabel}
                unrealizedPnlLabel={unrealizedPnlLabel}
                tradeableBalanceLabel={isConnected ? formatStakeUsd(balanceRaw) : "$0.00"}
                totalPnlLabel={profitSignedLabel}
                indexedEventsCount={eventsRows.length}
                claimsCount={claimsRows.length}
                address={address}
                isConnected={isConnected}
              />
            </div>
            <div className="px-4 py-4 lg:col-span-6 lg:py-5">
              <NetWorthCard
                surface="plain"
                title="Exposure and claims"
                showSecondaryMetrics={false}
                compactChart
                netWorthLabel={netWorthDisplayLabel}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                volumeLabel={isConnected ? formatStakeUsd(volumeRaw) : "$0.00"}
                profitLabel={profitSignedLabel}
                profitPositive={profitPositive}
              />
            </div>
            <div className="px-4 py-4 lg:col-span-3 lg:py-5">
              <CategoryDistributionCard slices={categorySlices} compact aboveFold showHistoryLink surface="plain" />
            </div>
          </div>

          {isConnected ? (
            <div className="shrink-0 border-t border-border/50 bg-muted/10 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Testnet funds ({STAKE_TOKEN_SYMBOL})</p>
                  {chainId === DEPLOYMENT_CHAIN_ID ? (
                    <>
                      {testnetNote ? <p className="mt-1 leading-snug">{testnetNote}</p> : null}
                      {gasLinks ? <p className="mt-1">{gasLinks}</p> : null}
                    </>
                  ) : (
                    <p className="mt-1 leading-snug">Switch to Base Sepolia to mint stake tokens for indexed markets.</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => void handleFaucetClaim()}
                  disabled={
                    faucetBusy ||
                    faucetConfigLoading ||
                    (chainId === DEPLOYMENT_CHAIN_ID &&
                      ((!faucetRelayEnabled && needsBaseSepoliaGas) ||
                        faucetAmount === undefined ||
                        !canUseFaucet))
                  }
                  className="inline-flex shrink-0 gap-2 px-4 py-2.5 text-sm font-semibold transition-colors hover:brightness-110"
                >
                  {faucetBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {faucetLabel}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col border-t border-border/50 lg:min-h-[12rem] dark:border-white/[0.08]">
            <PortfolioTradingPanel
              surface="plain"
              className="min-h-0 flex-1"
              mainTab={mainTab}
              onMainTabChange={handleMainTab}
              subTab={subTab}
              onSubTabChange={handleSubTab}
              watchlistPanel={watchlistPanel}
              onWatchlistPanelChange={handleWatchlistPanel}
              enrichedPositions={enrichedPositions}
              positionsLoading={Boolean(address && positionsQ.isLoading)}
              hideSmallPositions={hideSmallPositions}
              onHideSmallPositionsChange={setHideSmallPositions}
              events={eventsRows}
              eventsLoading={Boolean(address && eventsQ.isLoading)}
              claims={claimsRows}
              claimsLoading={Boolean(address && claimsQ.isLoading)}
              explorerTxBase={explorerTxBase}
              watchlistTemplateIds={watchlistIds}
              watchlistLabels={watchlistLabels}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
