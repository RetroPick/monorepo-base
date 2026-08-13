"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSignTypedData } from "wagmi";

import { Button } from "@/shared/components/ui/button";

import { DataStateBanner, DataStateEmpty } from "../../components/DataState";
import { formatMoneyAmountDisplay } from "../../funding/lib/formatCollateral";
import { useMarketsCapabilities } from "../../hooks/useMarketsQueries";
import { readMarketsE2EHarness } from "../../e2e/e2eHarness";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";
import {
  cancelOrder,
  getMyPortfolioSummary,
  listMyActivity,
  listMyFills,
  listMyOrders,
  listMyPositions,
  previewCancelOrder,
  type CancelPreviewResponse,
} from "../lib/tradingApiClient";
import { resolveMarketsTypedDataSigner } from "../lib/marketsSigning";

const POLL_MS = 10_000;

function cancelTypedData(preview: CancelPreviewResponse) {
  return {
    domain: { name: "Polymarket CTF Exchange", version: "2", chainId: preview.humanSummary.chainId },
    primaryType: "CancelOrder" as const,
    types: {
      CancelOrder: [
        { name: "orderId", type: "string" },
        { name: "maker", type: "address" },
        { name: "tokenId", type: "string" },
        { name: "salt", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    message: {
      ...preview.unsignedPayload,
      salt: BigInt(preview.unsignedPayload.salt),
      timestamp: BigInt(preview.unsignedPayload.timestamp),
    },
  };
}

export function TradingLifecyclePanel() {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const { data: capabilities } = useMarketsCapabilities();
  const queryClient = useQueryClient();
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();
  const [cancelPreview, setCancelPreview] = useState<CancelPreviewResponse | null>(null);
  const [actionError, setActionError] = useState<unknown>();
  const enabled = isSessionAuthenticated;
  const options = { enabled, refetchInterval: POLL_MS, refetchIntervalInBackground: false };
  const orders = useQuery({ queryKey: ["markets", "lifecycle", "orders"], queryFn: () => listMyOrders({ status: "open" }), ...options });
  const fills = useQuery({ queryKey: ["markets", "lifecycle", "fills"], queryFn: () => listMyFills(), ...options });
  const positions = useQuery({ queryKey: ["markets", "lifecycle", "positions"], queryFn: () => listMyPositions(), enabled: enabled && capabilities?.features?.portfolio_read === true, refetchInterval: POLL_MS });
  const summary = useQuery({ queryKey: ["markets", "lifecycle", "summary"], queryFn: () => getMyPortfolioSummary(), enabled: enabled && capabilities?.features?.portfolio_read === true, refetchInterval: POLL_MS });
  const activity = useQuery({ queryKey: ["markets", "lifecycle", "activity"], queryFn: () => listMyActivity(), enabled: enabled && capabilities?.features?.portfolio_read === true, refetchInterval: POLL_MS });
  const cancelEnabled = capabilities?.features?.order_submit === true;

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["markets", "lifecycle"] });
  const requestCancel = async (orderId: string) => {
    setActionError(undefined);
    try { setCancelPreview(await previewCancelOrder(orderId)); } catch (error) { setActionError(error); }
  };
  const confirmCancel = async () => {
    if (!cancelPreview || !cancelEnabled) return;
    setActionError(undefined);
    try {
      const signature = await resolveMarketsTypedDataSigner(
        async (typedData) => signTypedDataAsync(typedData as never),
        readMarketsE2EHarness()?.signSignature,
      )(cancelTypedData(cancelPreview));
      await cancelOrder(cancelPreview.orderId, { previewId: cancelPreview.previewId, contentHash: cancelPreview.contentHash, signature });
      setCancelPreview(null);
      await refresh();
    } catch (error) { setActionError(error); }
  };

  if (!isSessionAuthenticated) return <DataStateEmpty title="Sign in to view your portfolio" description="Orders, fills, and positions are private BFF projections." />;
  return <section className="space-y-5" aria-label="Trading lifecycle">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Portfolio and activity</h2><p className="text-xs text-muted-foreground">Refreshes every 10 seconds when this tab is visible.</p></div><Button size="sm" variant="outline" onClick={() => void refresh()}>Refresh</Button></div>
    <DataStateBanner error={actionError ?? orders.error ?? fills.error ?? positions.error ?? summary.error ?? activity.error} title="Could not refresh your trading lifecycle" onRetry={() => void refresh()} />
    {capabilities?.features?.portfolio_read === true ? <PortfolioMetrics summary={summary.data} /> : <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600" role="status">Portfolio projections are unavailable in this environment.</p>}
    {summary.data ? <p className="text-xs text-muted-foreground">{summary.data.pnlDisclaimer}</p> : null}
    <LifecycleList title="Open orders" empty="No open orders." loading={orders.isLoading}>{orders.data?.orders.map((order) => <li key={order.orderId} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3"><span>{order.side} {order.remainingSize} @ {order.price} · {order.status}</span><Button size="sm" variant="outline" disabled={!cancelEnabled} onClick={() => void requestCancel(order.orderId)}>Cancel</Button></li>)}</LifecycleList>
    <LifecycleList title="Fills" empty="No venue fills." loading={fills.isLoading}>{fills.data?.fills.map((fill) => <li key={fill.fillId} className="border-t border-border py-3">{fill.side} {fill.size} @ {fill.price} · fee {formatMoneyAmountDisplay(fill.fee)}</li>)}</LifecycleList>
    {capabilities?.features?.portfolio_read === true ? <><LifecycleList title="Positions" empty="No position projections." loading={positions.isLoading}>{positions.data?.positions.map((position) => <li key={position.positionId} className="border-t border-border py-3">{position.outcomeName ?? position.tokenId} · {position.size} shares · {formatMoneyAmountDisplay(position.unrealizedPnl)}</li>)}</LifecycleList><LifecycleList title="Activity" empty="No activity yet." loading={activity.isLoading}>{activity.data?.events.map((event) => <li key={event.eventId} className="border-t border-border py-3">{event.summary}</li>)}</LifecycleList></> : null}
    {cancelPreview ? <div className="rounded-xl border border-primary/40 bg-card p-4" role="dialog" aria-label="Cancel order preview"><h3 className="font-semibold">Confirm cancel</h3><p className="mt-1 text-sm text-muted-foreground">Cancel {cancelPreview.humanSummary.size} {cancelPreview.humanSummary.outcome} at {cancelPreview.humanSummary.price}. Your wallet will ask you to sign this cancel.</p><div className="mt-3 flex gap-2"><Button size="sm" disabled={isSigning || !cancelEnabled} onClick={() => void confirmCancel()}>{isSigning ? "Signing…" : "Sign and cancel"}</Button><Button size="sm" variant="outline" disabled={isSigning} onClick={() => setCancelPreview(null)}>Keep order</Button></div></div> : null}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function PortfolioMetrics({ summary }: { summary: Awaited<ReturnType<typeof getMyPortfolioSummary>> | undefined }) {
  const aggregate = summary?.aggregate;
  const markAvailability = aggregate?.availability.markValue;
  const realizedAvailability = aggregate?.availability.realizedPnl;

  return <div className="space-y-2">
    <div className="grid gap-3 sm:grid-cols-4">
      <Metric label="Mark value" value={formatMoneyAmountDisplay(aggregate?.totalMarkValue)} />
      <Metric label="Unrealized PnL" value={formatMoneyAmountDisplay(aggregate?.unrealizedPnl)} />
      <Metric label="Realized PnL" value={formatMoneyAmountDisplay(aggregate?.realizedPnl)} />
      <Metric label="Open positions" value={String(aggregate?.openPositionCount ?? "—")} />
    </div>
    {markAvailability?.state === "unavailable" ? <p className="text-xs text-muted-foreground" role="status">Mark coverage unavailable for {markAvailability.unavailableOpenPositionCount} of {aggregate?.openPositionCount ?? 0} open positions.</p> : null}
    {realizedAvailability?.state === "unavailable" ? <p className="text-xs text-muted-foreground" role="status">Realized PnL source unavailable.</p> : null}
  </div>;
}
function LifecycleList({ title, empty, loading, children }: { title: string; empty: string; loading: boolean; children: React.ReactNode }) { return <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">{title}</h3>{loading ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> : <ul className="mt-3 text-sm">{children || <li className="text-muted-foreground">{empty}</li>}</ul>}</section>; }
