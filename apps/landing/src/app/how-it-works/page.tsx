import Link from "next/link";
import { ArrowRight, Clock3, Gauge, Radio, ShieldCheck, Sparkles } from "lucide-react";

const flow = [
  {
    step: "01",
    title: "Join a live round",
    body:
      "Pick a market round built around a single clear outcome instead of a full trading interface.",
  },
  {
    step: "02",
    title: "Choose your position",
    body:
      "Select your call before the timer ends, with the lock time and rules visible before entry.",
  },
  {
    step: "03",
    title: "Let it resolve",
    body:
      "Settlement happens automatically from public market data, so the result stays transparent and repeatable.",
  },
] as const;

const detailCards = [
  {
    label: "How it works",
    title: "Fast market views turned into scheduled events.",
    body:
      "RetroPick lets users join short market rounds built around clear, repeatable outcomes. Pick a market, choose your position before the round locks, and wait for settlement as the result is resolved automatically from public data feeds. It is designed to make fast market views simple, transparent, and easy to understand.",
    icon: Radio,
    tone: "bg-[#0B0C10] text-white border-white/10",
    bodyTone: "text-[#A9B0BC]",
  },
  {
    label: "Features",
    title: "Structured formats without the noise.",
    body:
      "From quick Up or Down rounds to richer formats like Above or Below and Pick the Range, RetroPick gives users multiple ways to express a market view. Every round is structured with clear timing, transparent rules, and automated settlement.",
    icon: Gauge,
    tone: "bg-white text-[#0B0C10] border-black/5",
    bodyTone: "text-[#5A6270]",
  },
  {
    label: "Benefits",
    title: "Built for speed, clarity, and repeat play.",
    body:
      "RetroPick makes market participation more accessible by removing the complexity of traditional exchanges. It is faster to understand, easier to use, and built for repeat play, giving users a sharper way to engage with real market movement.",
    icon: Sparkles,
    tone: "bg-[#E8F7FD] text-[#0B0C10] border-[#B8EAF7]",
    bodyTone: "text-[#35505B]",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#EEF3F8] text-[#0B0C10]">
      <section className="relative overflow-hidden bg-[#0B0C10] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_28%),radial-gradient(circle_at_82%_20%,_rgba(255,255,255,0.08),_transparent_18%),linear-gradient(180deg,_#0B0C10_0%,_#0F1722_100%)]" />
        <div className="absolute left-[-10vw] top-[16vh] h-64 w-64 rounded-full bg-[#00D4FF]/10 blur-3xl" />
        <div className="absolute right-[8vw] top-[12vh] h-80 w-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-10 md:px-10 md:pb-28 md:pt-12">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-mono text-xs uppercase tracking-[0.26em] text-[#00D4FF]">
              Back to home
            </Link>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#A9B0BC]">
              Editorial overview
            </div>
          </div>

          <div className="mt-12 grid gap-10 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.3em] text-[#00D4FF]">
                How it works
              </p>
              <h1 className="mt-6 max-w-5xl text-[clamp(52px,8vw,126px)] font-bold leading-[0.9]">
                A cleaner way
                <br />
                to join market rounds.
              </h1>
              <p className="mt-7 max-w-3xl text-[clamp(18px,1.8vw,24px)] leading-relaxed text-[#A9B0BC]">
                Join a live market round, choose your position before the timer ends, and let the
                outcome resolve automatically from public market data. RetroPick turns price moves
                into fast, scheduled events that are simple to enter and easy to follow.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm md:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <Clock3 className="h-5 w-5 text-[#00D4FF]" />
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-[#A9B0BC]">
                    Clear timing
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    Open, lock, resolve.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <ShieldCheck className="h-5 w-5 text-[#00D4FF]" />
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-[#A9B0BC]">
                    Transparent rules
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    Users know what is being measured.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <Radio className="h-5 w-5 text-[#00D4FF]" />
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-[#A9B0BC]">
                    Public data
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    Outcomes resolve automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="mb-10 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.24em] text-[#00A8CC]">Round flow</p>
            <h2 className="mt-4 text-[clamp(34px,5vw,68px)] font-bold leading-[0.96]">
              One readable flow
              <br />
              from entry to outcome.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-relaxed text-[#5A6270] md:text-lg">
            The product is intentionally narrow: one market view, one timer, one settlement path.
            That constraint is what makes it feel faster and easier to understand.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {flow.map((item) => (
            <article
              key={item.step}
              className="rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(11,12,16,0.08)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm uppercase tracking-[0.24em] text-[#00A8CC]">
                  {item.step}
                </span>
                <ArrowRight className="h-4 w-4 text-[#5A6270]" />
              </div>
              <h3 className="mt-8 text-3xl font-semibold leading-tight">{item.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-[#5A6270]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 md:px-10 md:pb-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {detailCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.label}
                className={`rounded-[34px] border p-8 shadow-[0_24px_80px_rgba(11,12,16,0.08)] md:p-10 ${card.tone}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm uppercase tracking-[0.24em] opacity-75">
                    {card.label}
                  </p>
                  <Icon className="h-5 w-5 text-[#00D4FF]" />
                </div>
                <h2 className="mt-8 text-[clamp(28px,3vw,42px)] font-semibold leading-tight">
                  {card.title}
                </h2>
                <p className={`mt-5 text-base leading-relaxed md:text-lg ${card.bodyTone}`}>
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-6 pb-24 md:px-10 md:pb-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#0B0C10] text-white shadow-[0_40px_120px_rgba(11,12,16,0.2)]">
          <div className="grid gap-10 px-8 py-10 md:px-12 md:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.24em] text-[#00D4FF]">
                Why it matters
              </p>
              <h2 className="mt-5 text-[clamp(34px,5vw,68px)] font-bold leading-[0.94]">
                Market-native, but
                <br />
                easier to come back to.
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#A9B0BC]">
                RetroPick is built for users who want market participation without the cognitive
                load of a full exchange. The result is sharper, faster, and more repeatable.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
              <div className="space-y-4">
                {[
                  "Faster to understand than traditional exchange interfaces.",
                  "Clear rules and deterministic settlement improve trust.",
                  "Designed for repeat daily engagement without interface clutter.",
                ].map((point) => (
                  <div key={point} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-[#D7DCE5]">
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
