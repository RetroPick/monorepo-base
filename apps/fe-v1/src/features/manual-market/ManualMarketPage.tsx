import { Suspense, lazy, type ReactNode } from "react";
import { Activity, Clock3, Database, RadioTower } from "lucide-react";

import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import type { ProbabilityChartEpochMarkers } from "@/components/market/ProbabilityChart";
import MarketRules from "@/components/market/MarketRules";

const ProbabilityChart = lazy(() => import("@/components/market/ProbabilityChart"));

function ProbabilityChartFallback() {
  return (
    <div
      aria-hidden
      className="h-[300px] w-full animate-pulse rounded-lg bg-muted/40"
    />
  );
}
import IdeasActivityPanel from "@/components/market/IdeasActivityPanel";
import RelatedMarkets from "@/components/market/RelatedMarkets";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketPageTitleBar } from "./MarketPageTitleBar";
import { ConnectedManualMarketWatchlistButton } from "./ManualMarketWatchlistButton";
import { ManualTradeCard } from "./ManualTradeCard";
import { marketStickyClassName, useSiteHeaderOffset } from "./useSiteHeaderOffset";
import type { ManualMarketViewModel } from "./types";

function probabilityChartEpochMarkers(model: ManualMarketViewModel): ProbabilityChartEpochMarkers | undefined {
  const ae = model.activeEpoch;
  if (!ae) return undefined;
  const lockAtMs = ae.lockAt != null ? Date.parse(ae.lockAt) : NaN;
  const resolveAtMs = ae.resolveAt != null ? Date.parse(ae.resolveAt) : NaN;
  const markers: ProbabilityChartEpochMarkers = {};
  if (Number.isFinite(lockAtMs)) markers.lockAtMs = lockAtMs;
  if (Number.isFinite(resolveAtMs)) markers.resolveAtMs = resolveAtMs;
  return markers.lockAtMs != null || markers.resolveAtMs != null ? markers : undefined;
}

interface ManualMarketPageProps {
  model: ManualMarketViewModel;
  onBack: () => void;
  backLabel?: string;
  /** When set (indexed chain market), header lower rail shows market type + Discover categories instead of crypto tickers. */
  indexedHeaderContext?: { slug: string; marketType: number };
}

function StatPill({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-card px-3 py-2 dark:border-white/[0.07]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate font-mono text-sm font-semibold text-foreground", valueClassName)}>{value}</div>
    </div>
  );
}

function FreshnessBar({ model }: { model: ManualMarketViewModel }) {
  const lastBlock = model.dataFreshness?.lastIndexedBlock;
  const lastSync = model.dataFreshness?.lastSyncAt;
  const active = model.activeEpoch;

  if (!lastBlock && !lastSync && !active) return null;

  return (
    <div className="mt-4 grid gap-2 border border-border/70 bg-muted/15 py-3 text-xs dark:border-white/[0.06] lg:grid-cols-3">
      <div className="flex items-center gap-2 px-3 text-muted-foreground">
        <Database className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          Indexed block <span className="font-mono text-foreground">{lastBlock ?? "-"}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 text-muted-foreground">
        <RadioTower className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          Sync <span className="font-mono text-foreground">{lastSync ?? "-"}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 text-muted-foreground">
        <Clock3 className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          Epoch <span className="font-mono text-foreground">{active?.epochId ?? "-"}</span>
          {active?.status ? <span> · {active.status}</span> : null}
        </span>
      </div>
    </div>
  );
}

function RecentEpochsContent({ model }: { model: ManualMarketViewModel }) {
  const epochs = model.recentEpochs ?? [];
  if (epochs.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">Recent epochs</h3>
        <span className="text-xs text-muted-foreground">{epochs.length} indexed</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/70 dark:border-white/[0.07]">
        <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr] border-b border-border/70 bg-muted/20 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground dark:border-white/[0.06]">
          <span>Epoch</span>
          <span>Status</span>
          <span>Lock</span>
          <span>Claim</span>
        </div>
        <div className="divide-y divide-border/70 dark:divide-white/[0.06]">
          {epochs.slice(0, 8).map((epoch) => (
            <div key={epoch.epochId} className="grid grid-cols-[0.8fr_1fr_1fr_1fr] px-3 py-2 text-xs">
              <span className="font-mono text-foreground">#{epoch.epochId}</span>
              <span className="truncate text-muted-foreground">{epoch.status}</span>
              <span className="truncate font-mono text-muted-foreground">{epoch.lockAt ?? "-"}</span>
              <span
                className={cn(
                  "font-mono",
                  epoch.claimable ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground",
                )}
              >
                {epoch.claimable ? "yes" : "no"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChainMarketDetailsAccordion({ model, resolutionExtras }: { model: ManualMarketViewModel; resolutionExtras: ReactNode | null }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="details" className="border-border/70 dark:border-white/[0.07]">
        <AccordionTrigger className="text-left text-sm font-semibold tracking-tight hover:no-underline">
          Market and indexer details
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {model.headerStats.map((s) => (
              <StatPill key={s.label} {...s} />
            ))}
          </div>
          <FreshnessBar model={model} />
          {resolutionExtras}
          <RecentEpochsContent model={model} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function ManualMarketPage({
  model,
  onBack,
  backLabel = "Back to Markets",
  indexedHeaderContext,
}: ManualMarketPageProps) {
  const category = model.category ?? "Markets";
  const isChain = model.kind === "chain";
  const resolutionExtras = model.resolutionExtras ?? null;
  const watchlistTemplateId =
    isChain && model.tradeContext?.templateId ? (model.tradeContext.templateId as `0x${string}`) : null;

  useSiteHeaderOffset();

  return (
    <div className="market-page-sticky-offset min-h-screen w-full bg-background text-foreground">
      <Header omitBottomDivider indexedMarketContext={indexedHeaderContext} />
      <main className="mx-auto max-w-screen-2xl pb-12">
        {/* Polymarket-style: title + main column only; trade panel sits in the right column and never shares the title row width */}
        <div className="grid items-start gap-6 px-4 pt-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-8 xl:grid-cols-[minmax(0,1fr)_352px]">
          {/* `overflow-x-clip` on this column breaks `position:sticky` on MarketPageTitleBar (see index.css). */}
          <div className="min-w-0">
            <MarketPageTitleBar
              title={model.title}
              image={model.image}
              icon={model.icon}
              iconColor={model.iconColor}
              category={category}
              volumeLabel={model.volumeLabel}
              onBack={onBack}
              backLabel={backLabel}
              description={isChain ? undefined : model.description}
              showLivePill={isChain}
              className="mb-6 sm:mb-8"
              watchlistAction={
                watchlistTemplateId ? <ConnectedManualMarketWatchlistButton templateId={watchlistTemplateId} /> : undefined
              }
            />

            <div className="flex flex-col gap-4">
              {!isChain && model.headerStats.length > 0 ? (
                <div className="rounded-xl border border-border/60 bg-card dark:border-white/[0.08]">
                  <section className="px-3 py-4 dark:border-white/[0.06] sm:px-4">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                      {model.headerStats.map((s) => (
                        <StatPill key={s.label} {...s} />
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              <section className="px-0 pb-1 pt-0 sm:px-0">
                <div className="min-h-[300px]">
                  <Suspense fallback={<ProbabilityChartFallback />}>
                    <ProbabilityChart
                      outcomes={model.outcomes}
                      history={model.probabilityHistory}
                      embedded
                      epochMarkers={probabilityChartEpochMarkers(model)}
                    />
                  </Suspense>
                </div>
              </section>
            </div>

            {isChain ? (
              <section className="mt-4 border-t border-border/70 py-4 dark:border-white/[0.07]">
                <ChainMarketDetailsAccordion
                  model={model}
                  resolutionExtras={
                    resolutionExtras ? <div className="mt-4 space-y-4">{resolutionExtras}</div> : null
                  }
                />
              </section>
            ) : null}

            {!isChain && resolutionExtras ? (
              <section className="mt-4 border-t border-border/70 py-5 dark:border-white/[0.07]">{resolutionExtras}</section>
            ) : null}

            {!isChain && (model.recentEpochs?.length ?? 0) > 0 ? (
              <section className="mt-4 border-t border-border/70 py-5 dark:border-white/[0.07]">
                <RecentEpochsContent model={model} />
              </section>
            ) : null}

            <div className="grid gap-7">
              <section className="border-t border-border/70 pt-5 dark:border-white/[0.07]">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="size-4 text-muted-foreground" aria-hidden />
                  <h2 className="text-base font-semibold tracking-tight">Rules</h2>
                </div>
                <MarketRules category={category} />
              </section>

              <section className="border-t border-border/70 pt-5 dark:border-white/[0.07]">
                <IdeasActivityPanel />
              </section>

              {model.relatedMarkets.length > 0 ? (
                <section className="border-t border-border/70 pt-5 dark:border-white/[0.07]">
                  <RelatedMarkets
                    currentMarket={{
                      id: model.discoveryMarketId ?? "current",
                      title: model.title,
                      category,
                      outcomes: model.outcomes,
                    }}
                    markets={model.relatedMarkets}
                  />
                </section>
              ) : null}
            </div>
          </div>

          <aside className={cn("w-full shrink-0", marketStickyClassName())}>
            <ManualTradeCard outcomes={model.outcomes} tradeContext={model.tradeContext} />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
