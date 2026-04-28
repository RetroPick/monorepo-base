import type { ReactNode } from "react";
import { Activity, Clock3, Database, RadioTower } from "lucide-react";

import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProbabilityChart from "@/components/market/ProbabilityChart";
import MarketRules from "@/components/market/MarketRules";
import IdeasActivityPanel from "@/components/market/IdeasActivityPanel";
import RelatedMarkets from "@/components/market/RelatedMarkets";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketPageTitleBar } from "./MarketPageTitleBar";
import { ManualTradeCard } from "./ManualTradeCard";
import { marketStickyClassName, useSiteHeaderOffset } from "./useSiteHeaderOffset";
import type { ManualMarketViewModel } from "./types";

interface ManualMarketPageProps {
  model: ManualMarketViewModel;
  onBack: () => void;
  backLabel?: string;
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
          Indexed block <span className="font-mono text-foreground">{lastBlock ?? "—"}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 text-muted-foreground">
        <RadioTower className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          Sync <span className="font-mono text-foreground">{lastSync ?? "—"}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 text-muted-foreground">
        <Clock3 className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          Epoch <span className="font-mono text-foreground">{active?.epochId ?? "—"}</span>
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
              <span className="truncate font-mono text-muted-foreground">{epoch.lockAt ?? "—"}</span>
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

export function ManualMarketPage({ model, onBack, backLabel = "Back to Markets" }: ManualMarketPageProps) {
  const category = model.category ?? "Markets";
  const isChain = model.kind === "chain";
  const resolutionExtras = model.resolutionExtras ?? null;

  useSiteHeaderOffset();

  return (
    <div className="market-page-sticky-offset min-h-screen w-full bg-background text-foreground">
      <Header omitBottomDivider />
      <main className="mx-auto max-w-[1440px] pb-12">
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
              onBack={onBack}
              backLabel={backLabel}
              description={isChain ? undefined : model.description}
              showLivePill={isChain}
              className="mb-6 sm:mb-8"
            />

            <div className="flex flex-col rounded-xl border border-border/60 bg-card dark:border-white/[0.08]">
              {!isChain && model.headerStats.length > 0 ? (
                <section className="px-3 py-4 dark:border-white/[0.06] sm:px-4">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                    {model.headerStats.map((s) => (
                      <StatPill key={s.label} {...s} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-b-xl border-t border-border/50 px-3 pb-3 pt-3 dark:border-white/[0.06] sm:px-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Chance</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Market-implied probability over time</p>
                  </div>
                  <span className="rounded border border-border/70 px-2 py-1 font-mono text-xs text-muted-foreground dark:border-white/[0.07]">
                    Vol {model.volumeLabel}
                  </span>
                </div>
                <div className="min-h-[300px]">
                  <ProbabilityChart
                    outcomes={model.outcomes}
                    volume={model.volumeLabel}
                    history={model.probabilityHistory}
                    embedded
                  />
                </div>
              </section>
            </div>

            {isChain ? (
              <section className="border-t border-border/70 py-4 dark:border-white/[0.07]">
                <ChainMarketDetailsAccordion
                  model={model}
                  resolutionExtras={
                    resolutionExtras ? <div className="mt-4 space-y-4">{resolutionExtras}</div> : null
                  }
                />
              </section>
            ) : null}

            {!isChain && resolutionExtras ? (
              <section className="border-t border-border/70 py-5 dark:border-white/[0.07]">{resolutionExtras}</section>
            ) : null}

            {!isChain && (model.recentEpochs?.length ?? 0) > 0 ? (
              <section className="border-t border-border/70 py-5 dark:border-white/[0.07]">
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
