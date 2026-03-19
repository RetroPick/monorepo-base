import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { features } from "./landing-data";

export function FeaturesSection() {
  return (
    <section id="features" className="section-pinned z-30 bg-[#0B0C10]">
      <div className="relative z-10 flex h-full flex-col px-[6vw] py-[10vh]">
        <div className="mb-12 flex flex-col md:flex-row md:items-start md:justify-between">
          <h2 className="features-headline text-[clamp(36px,6vw,96px)] font-bold leading-tight text-white">
            More ways
            <br />
            to play.
          </h2>
          <p className="features-subheadline mt-4 max-w-[32vw] text-lg text-[#A9B0BC] md:mt-8 max-md:max-w-xl">
            Pick direction, levels, or relative moves. Find the market that matches your style.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 items-end gap-6 pb-[8vh] md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className={`${feature.cardClassName} card-dark group relative flex h-[36vh] min-h-[320px] flex-col p-6`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <Icon className="h-6 w-6 text-[#00D4FF]" />
                  <Link
                    href="/how-it-works"
                    aria-label={`Learn more about ${feature.title}`}
                    className="pulse-subtle flex h-10 w-10 items-center justify-center rounded-full border border-[#00D4FF]/50 transition-colors group-hover:bg-[#00D4FF]/10"
                  >
                    <ArrowUpRight className="h-4 w-4 text-[#00D4FF]" />
                  </Link>
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[#A9B0BC]">{feature.body}</p>
                <div className={`feature-visual ${feature.visualClassName} mt-auto`} aria-hidden="true">
                  {feature.title === "Direction" && (
                    <>
                      <div className="direction-axis" />
                      <div className="direction-trend direction-trend-up" />
                      <div className="direction-trend direction-trend-down" />
                      <div className="direction-split" />
                      <div className="direction-chip direction-chip-up">HIGHER</div>
                      <div className="direction-chip direction-chip-down">LOWER</div>
                    </>
                  )}
                  {feature.title === "Level" && (
                    <>
                      <div className="level-grid" />
                      <div className="level-threshold">
                        <span className="level-tag">STRIKE</span>
                      </div>
                      <div className="level-orb" />
                      <div className="level-trail" />
                      <div className="level-zone level-zone-top">ABOVE</div>
                      <div className="level-zone level-zone-bottom">BELOW</div>
                    </>
                  )}
                  {feature.title === "Discovery" && (
                    <>
                      <div className="discovery-halo" />
                      <div className="discovery-panel">
                        <span className="discovery-pill discovery-pill-asset">BTC</span>
                        <span className="discovery-pill discovery-pill-time">15m</span>
                        <span className="discovery-pill discovery-pill-hot">HOT</span>
                        <div className="discovery-track discovery-track-a" />
                        <div className="discovery-track discovery-track-b" />
                        <div className="discovery-track discovery-track-c" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
