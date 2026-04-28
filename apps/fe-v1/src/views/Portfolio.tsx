import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useBalance, useReadContracts, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ChevronRight, Droplets, LayoutGrid, Loader2, TrendingUp, Wallet } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useIndexerWebSocket } from "@/hooks/useIndexerWebSocket";
import {
  apiErrorSummary,
  fetchFaucetState,
  fetchHealth,
  fetchUserClaims,
  fetchUserPositions,
} from "@/lib/api/retropickApi";
import { marketCtaPrimary3d, marketCtaUp3d } from "@/lib/marketCtaStyles";
import { cn } from "@/lib/utils";
import { ABIS, CONTRACT_ADDRESSES, getContractAddresses } from "@/contracts/config";
import { DEPLOYMENT_CHAIN_ID } from "@/config/chains";
import { formatUsdc } from "@/config/tokens";
import { useToast } from "@/components/ui/use-toast";
import { formatUnits } from "viem";

function Sparkline({ positive = true }: { positive?: boolean }) {
  return (
    <svg className="h-8 w-full opacity-90" viewBox="0 0 100 28" preserveAspectRatio="none">
      <path
        d={positive ? "M0 22 Q 12 16 22 18 T 44 12 T 66 14 T 88 6 T 100 4" : "M0 6 Q 12 8 22 12 T 44 10 T 66 16 T 88 18 T 100 22"}
        className={cn("fill-none stroke-[2]", positive ? "stroke-emerald-500/90 dark:stroke-emerald-400/90" : "stroke-rose-500/90")}
      />
    </svg>
  );
}

function sumBigIntKey(rows: Record<string, unknown>[], key: string): bigint {
  let t = 0n;
  for (const r of rows) {
    if ("error" in r) continue;
    const v = r[key];
    if (typeof v === "string" && /^\d+$/.test(v)) t += BigInt(v);
  }
  return t;
}

function rawTokenLabel(raw: string | undefined, decimals = 18): string {
  if (!raw || !/^\d+$/.test(raw)) return "—";
  if (decimals === 6) return formatUsdc(BigInt(raw), 2);

  const divisor = 10n ** BigInt(decimals);
  const whole = BigInt(raw) / divisor;
  const fraction = BigInt(raw) % divisor;
  const scaledFraction = (fraction * 100n) / divisor;
  return `${whole.toLocaleString("en-US")}.${scaledFraction.toString().padStart(2, "0")}`;
}

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

function apiErrorLabel(error: unknown): string {
  return apiErrorSummary(error);
}

function gasBalanceLabel(value: bigint | undefined, decimals: number | undefined): string {
  if (value === undefined || decimals === undefined) return "-";
  const n = Number(formatUnits(value, decimals));
  return Number.isFinite(n) ? `${n.toFixed(6)} ETH` : "-";
}

const BASE_SEPOLIA_ETH_FAUCETS = [
  { label: "Coinbase", href: "https://portal.cdp.coinbase.com/products/faucet?token=ETH&network=base-sepolia" },
  { label: "Alchemy", href: "https://www.alchemy.com/faucets/base-sepolia" },
] as const;

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

const Portfolio = () => {
  const { address, isConnected } = useAccount();
  const { chainId } = useAccount();
  const readWalletAddress = address ?? "0x0000000000000000000000000000000000000000";
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const qc = useQueryClient();
  const { toast } = useToast();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync, data: faucetTxHash, isPending: isFaucetWritePending } = useWriteContract();
  const { isLoading: isFaucetConfirming, isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({
    hash: faucetTxHash,
    chainId: DEPLOYMENT_CHAIN_ID,
  });
  const gasBalanceQ = useBalance({
    address,
    chainId: DEPLOYMENT_CHAIN_ID,
    query: {
      enabled: Boolean(address),
      staleTime: 10_000,
    },
  });
  useIndexerWebSocket(!!address);

  const healthQ = useQuery({
    queryKey: ["retropick-api", "health"],
    queryFn: fetchHealth,
    staleTime: 5_000,
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

  const faucetQ = useQuery({
    queryKey: ["retropick-api", "faucet-state", address],
    queryFn: () => fetchFaucetState(address!),
    enabled: Boolean(address),
    staleTime: 15_000,
  });

  const posRows = (positionsQ.data?.positions ?? []) as Record<string, unknown>[];
  const validPos = posRows.filter((p) => !p.error);
  const pendingClaim = sumBigIntKey(validPos, "pendingClaimAmount");
  const totalStake = sumBigIntKey(validPos, "totalStake");
  const claimableCount = validPos.filter((p) => p.claimableNow === true).length;
  const claimsRows = claimsQ.data?.claims ?? [];

  const lastSync = healthQ.data?.lastSyncAt ?? positionsQ.data?.dataFreshness?.lastSyncAt;
  const summary = {
    settledPnL: "—",
    winRate: "—",
    pendingClaimAmount: isConnected
      ? pendingClaim > 0n
        ? `~${(Number(pendingClaim) / 1e18).toFixed(4)} (stake token)`
        : "0"
      : "—",
  };
  const liveCount = validPos.length;
  const lockedCount = 0;
  const winRate = 0;
  const fmtAddr = (t: string) => (t.length > 14 ? `${t.slice(0, 10)}…` : t);
  const faucet = faucetQ.data;
  const registryContracts = getContractAddresses(DEPLOYMENT_CHAIN_ID);
  const faucetAddress = asAddress(faucet?.tokenFaucet) ?? CONTRACT_ADDRESSES.Faucet;
  const stakeTokenAddress = asAddress(faucet?.stakeToken) ?? registryContracts.stakeToken;
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
  const onchainDecimals =
    faucetReadsQ.data?.[2]?.status === "success" ? asNumber(faucetReadsQ.data[2].result) : undefined;
  const onchainBalance =
    faucetReadsQ.data?.[3]?.status === "success" ? asBigInt(faucetReadsQ.data[3].result) : undefined;
  const hasOnchainFaucetState =
    onchainBalance !== undefined || onchainDecimals !== undefined || onchainMaxMintAmount !== undefined;
  const faucetDecimals = onchainDecimals ?? faucet?.stakeTokenDecimals ?? 18;
  const canUseFaucet =
    isConnected &&
    (faucet?.chainId === undefined || faucet.chainId === DEPLOYMENT_CHAIN_ID) &&
    Boolean(faucetAddress);
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
  const faucetBusy = isSwitchingChain || isFaucetWritePending || isFaucetConfirming;
  let faucetLabel = "Claim test tokens";
  if (!isConnected) {
    faucetLabel = "Connect wallet";
  } else if (chainId !== DEPLOYMENT_CHAIN_ID) {
    faucetLabel = "Switch to Base Sepolia";
  } else if (isFaucetWritePending) {
    faucetLabel = "Confirm in wallet";
  } else if (isFaucetConfirming) {
    faucetLabel = "Claim pending";
  } else if (faucetConfigLoading) {
    faucetLabel = "Loading faucet";
  } else if (needsBaseSepoliaGas) {
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
      title: "Faucet claimed",
      description: "Mock stake token mint confirmed. Refreshing wallet balance.",
    });
    void faucetReadsQ.refetch();
    void gasBalanceQ.refetch();
    void qc.invalidateQueries({ queryKey: ["retropick-api", "faucet-state", address] });
    void qc.invalidateQueries({ queryKey: ["retropick-api", "user-positions", address] });
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
      if (nativeGasBalance !== undefined && nativeGasBalance === 0n) {
        toast({
          title: "Need Base Sepolia ETH",
          description: "This faucet mints stake tokens, but the wallet still needs Base Sepolia ETH to pay gas.",
          variant: "destructive",
        });
        return;
      }
      if (faucetAmount === undefined || faucetAmount <= 0n) {
        toast({
          title: "Faucet unavailable",
          description: "Could not read the faucet max mint amount from Base Sepolia.",
          variant: "destructive",
        });
        return;
      }
      await writeContractAsync({
        address: stakeTokenAddress,
        abi: ABIS.MockERC20,
        functionName: "mint",
        args: [address, faucetAmount],
        chainId: DEPLOYMENT_CHAIN_ID,
      } as unknown as Parameters<typeof writeContractAsync>[0]);
    } catch (error) {
      toast({
        title: "Faucet claim failed",
        description: faucetErrorMessage(error, faucetCooldownText),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 lg:px-10 lg:pt-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Portfolio</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">Positions & performance</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Open exposure, settled PnL, and claims in one place — same layout language as Discover and Up vs Down.{" "}
              <Link to="/app/chain-markets" className="text-accent-cyan underline-offset-4 hover:underline">
                Indexed chain markets
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/app/markets/all"
              className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover dark:border-white/[0.08]"
            >
              <LayoutGrid className="size-4 opacity-70" aria-hidden />
              Discover
            </Link>
            <Link
              to="/app/markets/updown/crypto"
              className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover dark:border-white/[0.08]"
            >
              Up vs Down
              <ChevronRight className="size-4 opacity-60" aria-hidden />
            </Link>
          </div>
        </div>

        {!isConnected ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 dark:border-white/[0.1] dark:bg-white/[0.03]">
            <Wallet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              Connect a wallet to load positions and claims from the RetroPick API (RPC-backed views).
            </p>
            <Link
              to="/login"
              className={cn(marketCtaPrimary3d, "shrink-0 px-4 py-2 text-sm font-semibold")}
            >
              Connect
            </Link>
          </div>
        ) : null}
        {isConnected && lastSync ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Indexer last sync: <span className="font-mono text-foreground">{String(lastSync)}</span>
          </p>
        ) : null}
        {positionsQ.isError ? (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Could not load indexed positions from <code className="text-xs">{apiErrorLabel(positionsQ.error)}</code>.
          </p>
        ) : null}

        <section className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 dark:bg-emerald-500/[0.08]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Droplets className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                  <h2 className="text-sm font-bold tracking-tight text-foreground">Need test funds?</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Mint the assigned MockERC20 stake token, then open an indexed market and trade directly from your wallet.
                  </p>
                {isConnected ? (
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    Balance {rawTokenLabel(onchainBalance?.toString() ?? faucet?.stakeTokenBalance, faucetDecimals)} · Mint{" "}
                    {rawTokenLabel(faucetAmount?.toString(), faucetDecimals)} · Gas{" "}
                    {gasBalanceLabel(gasBalanceQ.data?.value, gasBalanceQ.data?.decimals)}
                  </p>
                ) : null}
                {needsBaseSepoliaGas ? (
                  <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Native Base Sepolia ETH is required for gas.{" "}
                    {BASE_SEPOLIA_ETH_FAUCETS.map((item, index) => (
                      <span key={item.href}>
                        {index > 0 ? " · " : ""}
                        <a href={item.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                          {item.label} faucet
                        </a>
                      </span>
                    ))}
                  </p>
                ) : null}
                {faucetCooldownText ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    TokenFaucet cooldown metadata: {faucetCooldownText}
                  </p>
                ) : null}
                {faucetQ.isError && !hasOnchainFaucetState ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Faucet API unavailable at <code>{apiErrorLabel(faucetQ.error)}</code>.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleFaucetClaim()}
                disabled={
                  !isConnected ||
                  faucetBusy ||
                  faucetConfigLoading ||
                  needsBaseSepoliaGas ||
                  faucetAmount === undefined ||
                  (isConnected && !canUseFaucet && chainId === DEPLOYMENT_CHAIN_ID)
                }
                className={cn(
                  marketCtaUp3d,
                  "inline-flex min-w-[12rem] items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-45",
                )}
              >
                {faucetBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {faucetLabel}
              </button>
              <Link
                to="/app/chain-markets"
                className={cn(marketCtaPrimary3d, "inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold")}
              >
                Browse indexed markets
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-4">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-border dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Realized PnL</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">{summary.settledPnL}</p>
            <p className="mt-1 text-xs text-muted-foreground">Settled markets only</p>
            {isConnected ? (
              <div className="mt-3">
                <Sparkline positive />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Win rate</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem]">{summary.winRate}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {liveCount} live · {lockedCount} awaiting resolution
            </p>
            {isConnected ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last 30d</span>
                <div
                  className="relative flex size-[4.25rem] shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(hsl(var(--primary)) 0% ${winRate}%, hsl(var(--muted)) ${winRate}% 100%)`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-card" />
                  <span className="relative z-10 text-xs font-bold tabular-nums text-foreground">—</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Available to claim</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-[1.65rem]">
              {summary.pendingClaimAmount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isConnected
                ? claimableCount > 0
                  ? `${claimableCount} claimable position(s)`
                  : "Nothing pending"
                : "Connect to sync claims"}
            </p>
            <button
              type="button"
              disabled={!isConnected}
              className={cn(marketCtaPrimary3d, "mt-4 w-full py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40")}
            >
              Claim all
            </button>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">In play</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem]">
              {isConnected ? (totalStake > 0n ? `~${(Number(totalStake) / 1e18).toFixed(4)}` : "0") : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isConnected ? `${validPos.length} from chain view` : "Connect for live exposure"}
            </p>
            <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total stake (raw)</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {isConnected ? totalStake > 0n ? totalStake.toString() : "0" : "—"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:gap-12">
          <div className="min-w-0 flex-1 space-y-10">
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight text-foreground">Open positions</h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {validPos.length} active
                  {positionsQ.isLoading ? " · loading…" : null}
                </span>
              </div>
              <div className="grid gap-3">
                {posRows.length === 0 && isConnected && !positionsQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    No positions yet. Trade on{" "}
                    <Link to="/app/chain-markets" className="text-primary hover:underline">
                      indexed markets
                    </Link>{" "}
                    to appear here.
                  </p>
                ) : null}
                {posRows.map((position, i) => {
                  const err = position.error;
                  const tid = typeof position.templateId === "string" ? position.templateId : "";
                  return (
                    <div
                      key={tid || `p-${i}`}
                      className="group rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-border hover:bg-card-hover dark:border-white/[0.08] dark:shadow-none sm:p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                                err ? "border-amber-500/40 text-amber-700" : "border-border/60 text-foreground",
                              )}
                            >
                              {fmtAddr(tid || "—")}
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <span className={cn("size-1.5 rounded-full", err ? "bg-amber-500" : "bg-emerald-500")} aria-hidden />
                              {err ? "rpc" : "epoch " + String(position.epochId ?? "—")}
                            </span>
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary sm:text-[0.95rem]">
                            {err ? String(err) : `Total stake (wei): ${String(position.totalStake ?? "0")}`}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {err ? "Fix RPC or template id" : `Claimable now: ${String(position.claimableNow)} · Status: ${String(position.status ?? "—")}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:text-right">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">View</p>
                            <div className="mt-0.5 font-mono text-xs text-foreground">
                              {tid ? (
                                <Link to={`/app/chain-markets/${encodeURIComponent(tid)}`} className="text-primary hover:underline">
                                  Open
                                </Link>
                              ) : (
                                "—"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight text-foreground">Ready to claim</h2>
                <span className="text-xs text-muted-foreground">Settled wins</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm dark:border-white/[0.08] dark:shadow-none">
                <ul className="divide-y divide-border/50 dark:divide-white/[0.06]">
                  {claimsRows.length === 0 && isConnected && !claimsQ.isLoading ? (
                    <li className="px-4 py-4 text-sm text-muted-foreground">No claim events indexed for this wallet.</li>
                  ) : null}
                  {claimsRows.map((round) => (
                    <li key={`${round.txHash}-${round.id}`}>
                      <div className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-foreground">
                            {fmtAddr(round.templateId)} · epoch {round.epochId}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Amount: {String(round.eventPayload?.amount ?? "—")} · epoch claimable:{" "}
                            {String(round.epochClaimable ?? "—")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:shrink-0">
                          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                            {round.txHash.slice(0, 8)}…
                          </span>
                          <Link
                            to={`/app/chain-markets/${encodeURIComponent(round.templateId)}`}
                            className={cn(
                              marketCtaUp3d,
                              "shrink-0 px-4 py-2 text-xs font-semibold",
                            )}
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <aside className="w-full shrink-0 lg:w-[min(100%,20rem)] lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-xl bg-card shadow-none dark:ring-1 dark:ring-white/[0.04]">
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-3.5 dark:border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">Leaderboard</span>
                  <TrendingUp className="size-3.5 text-primary" aria-hidden />
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden />
              </div>
              <ul className="divide-y divide-border/50 dark:divide-white/[0.06]">
                {[
                  { rank: 1, name: "—", pnl: "—" },
                  { rank: 2, name: "—", pnl: "—" },
                  { rank: 3, name: "—", pnl: "—" },
                ].map((entry) => (
                  <li key={entry.rank}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-semibold tabular-nums text-muted-foreground">
                          {entry.rank}
                        </span>
                        <span className="truncate text-sm font-semibold text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{entry.pnl}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border/40 px-4 py-3 dark:border-white/[0.06]">
                <Link
                  to="/app/leaderboard"
                  className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Full rankings
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border/60 bg-card/80 p-4 dark:border-white/[0.08]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Activity</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Trade and settlement history lives on{" "}
                <Link to="/app/activity" className="font-semibold text-primary hover:underline">
                  Activity
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Portfolio;
