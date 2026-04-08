import { useNavigate, useParams, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Icon from "@/components/Icon";
import { useMarkets } from "@/context/MarketContext";
import { useAllMarkets } from "@/context/AllMarketsContext";
import RelatedMarkets from "@/components/market/RelatedMarkets";

const MarketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { markets } = useMarkets();
  const { markets: allMarkets } = useAllMarkets();

  const stateMarket = (location.state as { market?: typeof markets[0] })?.market;
  const market =
    stateMarket ??
    allMarkets.find((m) => m.id === id) ??
    markets.find((m) => m.id === id) ??
    markets[0];

  const isV1Market = Boolean(
    market?.oracleSource ?? market?.timeframe ?? market?.lockRule
  );
  const marketsForRelated = stateMarket || allMarkets.find((m) => m.id === id)
    ? allMarkets
    : markets;

  if (!market) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Market not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-3 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow_back" className="text-lg" />
          Back
        </button>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-border/70 bg-card p-6 shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)] lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background/75">
                <Icon name={market.icon} className={market.iconColor || "text-foreground"} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {market.category}
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                  {market.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                  {market.description}
                </p>
              </div>
            </div>

            {isV1Market && (
              <>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {market.oracleSource && (
                    <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Oracle source</div>
                      <div className="mt-2 text-sm font-semibold text-foreground">{market.oracleSource}</div>
                    </div>
                  )}
                  {market.timeframe && (
                    <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Timeframe</div>
                      <div className="mt-2 text-sm font-semibold text-foreground">{market.timeframe}</div>
                    </div>
                  )}
                  {market.lockRule && (
                    <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Lock rule</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">{market.lockRule}</div>
                    </div>
                  )}
                  {market.closeRule && (
                    <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Close rule</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">{market.closeRule}</div>
                    </div>
                  )}
                </div>

                {market.resolutionFormula && (
                  <div className="mt-6 rounded-2xl border border-border/70 bg-background/75 p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Resolution formula</div>
                    <div className="mt-2 text-sm leading-7 text-foreground">{market.resolutionFormula}</div>
                  </div>
                )}

                {market.invalidationRule && (
                  <div className="mt-6 rounded-2xl border border-border/70 bg-background/75 p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Invalid / refund policy</div>
                    <div className="mt-2 text-sm leading-7 text-muted-foreground">{market.invalidationRule}</div>
                  </div>
                )}
              </>
            )}

            {!isV1Market && (market.volume || market.expiry) && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {market.volume && (
                  <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Volume</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{market.volume}</div>
                  </div>
                )}
                {market.expiry && (
                  <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Expiry</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{market.expiry}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-border/70 bg-card p-6 shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Outcome board
              </div>
              <div className="mt-5 space-y-3">
                {market.outcomes.map((outcome) => (
                  <div key={outcome.id} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">{outcome.label}</div>
                      <div className="text-lg font-semibold text-foreground">{Math.round(outcome.probability)}%</div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400"
                        style={{ width: `${outcome.probability}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <RelatedMarkets currentMarket={market} markets={marketsForRelated} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MarketDetail;
