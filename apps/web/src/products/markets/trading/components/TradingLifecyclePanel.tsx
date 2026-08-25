"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSignMessage } from "wagmi";

import { Button } from "@/shared/components/ui/button";

import { DataStateBanner, DataStateEmpty } from "../../components/DataState";
import { formatMoneyAmountDisplay } from "../../funding/lib/formatCollateral";
import { useMarketsCapabilities } from "../../hooks/useMarketsQueries";
import { getMarketsClient } from "../../api/marketsClient";
import { getMarketsApiOrigin } from "../../wallet/config/runtimeEnv";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";
import {
  cancelOrder,
  getMyPortfolioSummary,
  listMyActivity,
  listMyFills,
  listMyOrders,
  listMyPositions,
  previewCancelOrder,
} from "../lib/tradingApiClient";

const POLL_MS = 10_000;

export function TradingLifecyclePanel() {
  const { expiresAt, isSessionAuthenticated } = useMarketsWalletSession();
  const { data: capabilities } = useMarketsCapabilities();
  const queryClient = useQueryClient();
  const { signMessageAsync, isPending: isSignPending } = useSignMessage();
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const portfolioEnabled = isSessionAuthenticated && capabilities?.features?.portfolio_read === true;
  const orderSubmitEnabled = capabilities?.features?.order_submit === true;
  const canCancel = portfolioEnabled && orderSubmitEnabled && isFutureExpiry(expiresAt) && Boolean(getMarketsApiOrigin());
  const options = { enabled: portfolioEnabled, refetchInterval: POLL_MS, refetchIntervalInBackground: false };
  const orders = useQuery({ queryKey: ["markets", "lifecycle", "orders"], queryFn: () => listMyOrders(), ...options });
  const fills = useQuery({ queryKey: ["markets", "lifecycle", "fills"], queryFn: () => listMyFills(), ...options });
  const positions = useQuery({ queryKey: ["markets", "lifecycle", "positions"], queryFn: () => listMyPositions(), ...options });
  const summary = useQuery({ queryKey: ["markets", "lifecycle", "summary"], queryFn: () => getMyPortfolioSummary(), ...options });
  const activity = useQuery({ queryKey: ["markets", "lifecycle", "activity"], queryFn: () => listMyActivity(), ...options });

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["markets", "lifecycle"] });
  const cancelOpenOrder = async (orderId: string) => {
    if (!canCancel || cancelingOrderId) return;

    setCancelingOrderId(orderId);
    setCancelError(null);
    try {
      const eligibility = await getMarketsClient().getEligibility();
      if (!eligibility.data?.eligible) {
        setCancelError(eligibility.data?.reason ?? "Trading is not available for your session.");
        return;
      }
      const preview = await previewCancelOrder(orderId);
      if (!isFutureExpiry(preview.expiresAt)) {
        setCancelError("Cancel preview expired. Request a new preview.");
        return;
      }
      const signature = await signMessageAsync({ message: preview.contentHash });
      await cancelOrder(orderId, {
        previewId: preview.previewId,
        contentHash: preview.contentHash,
        signature,
      });
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cancel request failed.";
      setCancelError(/reject|denied|cancel/i.test(message) ? "Signature declined. Your order remains open." : message);
    } finally {
      setCancelingOrderId(null);
    }
  };

  if (!isSessionAuthenticated) return <DataStateEmpty title="Sign in to view your portfolio" description="Orders, fills, and positions are private BFF projections." />;
  if (capabilities?.features?.portfolio_read !== true) return <DataStateEmpty title="Portfolio projections unavailable" description="This environment does not currently provide private portfolio projections." />;

  const freshness = summary.data?.freshness ?? positions.data?.freshness;
  const isDelayed = freshness?.state === "stale" || freshness?.state === "resyncing";

  return <section className="space-y-5" aria-label="Portfolio projections">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Portfolio and activity</h2><p className="text-xs text-muted-foreground">Refreshes every 10 seconds when this tab is visible.</p></div><Button size="sm" variant="outline" onClick={() => void refresh()}>Refresh</Button></div>
    <DataStateBanner error={orders.error ?? fills.error ?? positions.error ?? summary.error ?? activity.error} title="Could not refresh your portfolio projections" onRetry={() => void refresh()} />
    {cancelError ? <p className="text-sm text-destructive" role="alert">{cancelError}</p> : null}
    {isDelayed ? <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600" role="status">Portfolio projection may be delayed while the BFF refreshes venue data.</p> : null}
    <PortfolioMetrics summary={summary.data} />
    {summary.data ? <p className="text-xs text-muted-foreground">{summary.data.pnlDisclaimer}</p> : null}
    <LifecycleList title="Open orders" empty="No open order projections." loading={orders.isLoading}>{orders.data?.orders.map((order) => <li key={order.orderId} className="border-t border-border py-3"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{order.side} {order.remainingSize} · {order.price}</p><p className="mt-1 text-xs text-muted-foreground">{order.status}</p></div><Button size="sm" variant="outline" disabled={!canCancel || isSignPending || cancelingOrderId != null || order.status !== "open"} onClick={() => void cancelOpenOrder(order.orderId)}>{cancelingOrderId === order.orderId ? "Canceling…" : "Cancel order"}</Button></div></li>)}</LifecycleList>
    <LifecycleList title="Fills" empty="No fill projections." loading={fills.isLoading}>{fills.data?.fills.map((fill) => <li key={fill.fillId} className="border-t border-border py-3"><p className="font-medium">{fill.side} {fill.size} · {fill.price}</p><p className="mt-1 text-xs text-muted-foreground">Order {fill.orderId}</p></li>)}</LifecycleList>
    <LifecycleList title="Positions" empty="No position projections." loading={positions.isLoading}>{positions.data?.positions.map((position) => <li key={position.positionId} className="border-t border-border py-3"><p className="font-medium">{position.outcomeName ?? position.tokenId} · {position.size} shares</p><div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3"><ProjectionValue label="Mark" value={position.markPrice} unavailable="Mark unavailable" /><ProjectionValue label="Current value" value={formatMoneyAmountDisplay(position.markValue)} unavailable="Current value unavailable" /><ProjectionValue label="Unrealized PnL" value={formatMoneyAmountDisplay(position.unrealizedPnl)} unavailable="Unrealized PnL unavailable" /></div></li>)}</LifecycleList>
    <LifecycleList title="Activity" empty="No activity yet." loading={activity.isLoading}>{activity.data?.events.map((event) => <li key={event.eventId} className="border-t border-border py-3">{event.summary}</li>)}</LifecycleList>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function isFutureExpiry(expiresAt: string | null): boolean { return expiresAt != null && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > Date.now(); }
function ProjectionValue({ label, value, unavailable }: { label: string; value: string | null | undefined; unavailable: string }) { return <p>{value && value !== "—" ? `${label} ${value}` : unavailable}</p>; }
function PortfolioMetrics({ summary }: { summary: Awaited<ReturnType<typeof getMyPortfolioSummary>> | undefined }) {
  const aggregate = summary?.aggregate;
  const markAvailability = aggregate?.availability.markValue;
  const realizedAvailability = aggregate?.availability.realizedPnl;

  return <div className="space-y-2">
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Mark value" value={formatMoneyAmountDisplay(aggregate?.totalMarkValue)} />
      <Metric label="Cost basis" value={formatMoneyAmountDisplay(aggregate?.totalCostBasis)} />
      <Metric label="Unrealized PnL" value={formatMoneyAmountDisplay(aggregate?.unrealizedPnl)} />
      <Metric label="Realized PnL" value={formatMoneyAmountDisplay(aggregate?.realizedPnl)} />
      <Metric label="Claimable value" value={formatMoneyAmountDisplay(aggregate?.claimableValue)} />
      <Metric label="Open positions" value={String(aggregate?.openPositionCount ?? "—")} />
    </div>
    {markAvailability?.state === "unavailable" ? <p className="text-xs text-muted-foreground" role="status">Mark coverage unavailable for {markAvailability.unavailableOpenPositionCount} of {aggregate?.openPositionCount ?? 0} open positions.</p> : null}
    {realizedAvailability?.state === "unavailable" ? <p className="text-xs text-muted-foreground" role="status">Realized PnL source unavailable.</p> : null}
  </div>;
}
function LifecycleList({ title, empty, loading, children }: { title: string; empty: string; loading: boolean; children: React.ReactNode }) { return <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">{title}</h3>{loading ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> : <ul className="mt-3 text-sm">{children || <li className="text-muted-foreground">{empty}</li>}</ul>}</section>; }
