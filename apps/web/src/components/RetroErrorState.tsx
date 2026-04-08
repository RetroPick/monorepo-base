import type { ReactNode } from "react";
import { RefreshCw, Sparkles, TriangleAlert } from "lucide-react";

interface RetroErrorStateProps {
  onRefresh: () => void;
}

const tickerItems = [
  "RetroPick system sync",
  "Pudgy Penguins on-call",
  "Error state contained",
  "Market rescue in progress"
];

function Penguin({
  className,
  accentClass,
  accessory
}: {
  className?: string;
  accentClass: string;
  accessory: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="absolute inset-x-6 bottom-0 h-[170px] rounded-[44%] bg-slate-950 shadow-[0_32px_70px_-34px_rgba(15,23,42,0.85)]" />
      <div className="absolute inset-x-[34px] bottom-[18px] h-[124px] rounded-[45%] bg-white" />
      <div className="absolute left-[44px] top-[38px] h-7 w-7 rounded-full bg-white" />
      <div className="absolute right-[44px] top-[38px] h-7 w-7 rounded-full bg-white" />
      <div className="absolute left-[52px] top-[46px] h-3.5 w-3.5 rounded-full bg-slate-950" />
      <div className="absolute right-[52px] top-[46px] h-3.5 w-3.5 rounded-full bg-slate-950" />
      <div className="absolute left-1/2 top-[72px] h-8 w-10 -translate-x-1/2 rounded-b-[18px] rounded-t-[6px] bg-amber-400" />
      <div className="absolute left-[-2px] top-[106px] h-14 w-8 rounded-full bg-slate-950" />
      <div className="absolute right-[-2px] top-[106px] h-14 w-8 rounded-full bg-slate-950" />
      <div className="absolute bottom-[-2px] left-[48px] h-7 w-10 rounded-full bg-amber-400" />
      <div className="absolute bottom-[-2px] right-[48px] h-7 w-10 rounded-full bg-amber-400" />
      <div className={`absolute right-[12px] top-[92px] h-12 w-12 rounded-2xl ${accentClass} shadow-lg`} />
      {accessory}
    </div>
  );
}

function Sparkle({ className, delay = "0s" }: { className: string; delay?: string }) {
  return (
    <div className={className}>
      <div className="retro-error-spark" style={{ animationDelay: delay }}>
        <Sparkles className="size-4" />
      </div>
    </div>
  );
}

export default function RetroErrorState({ onRefresh }: RetroErrorStateProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f3fbff_0%,#e0f2fe_46%,#f8fafc_100%)] text-slate-950">
      <style>{`
        @keyframes retro-error-bob {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(0, -12px, 0) rotate(-1.5deg); }
        }
        @keyframes retro-error-sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes retro-error-spark {
          0%, 100% { opacity: 0.45; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes retro-error-chip {
          0%, 100% { opacity: 0.72; transform: translate3d(0, 0, 0); }
          50% { opacity: 1; transform: translate3d(0, -1px, 0); }
        }
        .retro-error-bob {
          animation: retro-error-bob 3.4s ease-in-out infinite;
          will-change: transform;
        }
        .retro-error-bob-delayed {
          animation: retro-error-bob 3.9s ease-in-out infinite;
          will-change: transform;
        }
        .retro-error-sway {
          transform-origin: bottom center;
          animation: retro-error-sway 2.8s ease-in-out infinite;
          will-change: transform;
        }
        .retro-error-spark {
          animation: retro-error-spark 1.8s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .retro-error-chip {
          animation: retro-error-chip 2.8s ease-in-out infinite;
          will-change: transform, opacity;
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.22),transparent_38%)]" />
      <div className="absolute left-[-8rem] top-16 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute right-[-6rem] top-28 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center gap-12 px-6 py-10 lg:flex-row lg:gap-16">
        <div className="w-full max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-sky-700 shadow-sm backdrop-blur">
            <Sparkles className="size-3.5" />
            RetroPick Rescue Mode
          </div>

          <h1 className="font-display mt-6 max-w-xl text-5xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-6xl">
            RetroPick hit a cold splash.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
            Two Pudgy Penguins are skating through the error, rebalancing the feed, and warming the app back up. Refresh to
            reconnect to the market.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-[0_22px_50px_-24px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <RefreshCw className="size-4" />
              Reload RetroPick
            </button>
            <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white/80 px-5 py-3.5 text-sm font-semibold text-sky-800 backdrop-blur">
              <TriangleAlert className="size-4" />
              Penguin repair crew active
            </div>
          </div>
        </div>

        <div className="relative flex w-full max-w-2xl items-center justify-center">
          <div className="relative h-[480px] w-full max-w-[620px] overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(240,249,255,0.84))] p-6 shadow-[0_40px_120px_-45px_rgba(14,116,144,0.45)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 border-b border-sky-100 bg-slate-950 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-100">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tickerItems.map((item, index) => (
                  <div
                    key={item}
                    className="retro-error-chip rounded-full border border-sky-400/20 bg-white/8 px-3 py-1.5 text-center"
                    style={{ animationDelay: `${index * 0.18}s` }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute left-6 top-20 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-700 shadow-lg">
              Error Ice Rink
            </div>

            <div className="absolute right-6 top-24 rounded-[24px] border border-sky-100 bg-white/85 px-4 py-3 shadow-lg backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Status</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">Connection warming up</div>
            </div>

            <div className="absolute inset-x-10 bottom-9 h-28 rounded-[999px] bg-[linear-gradient(180deg,rgba(186,230,253,0.5),rgba(125,211,252,0.18))] shadow-inner" />
            <div className="absolute inset-x-16 bottom-12 h-px bg-white/80" />

            <Sparkle className="absolute left-16 top-32 text-sky-400" />
            <Sparkle className="absolute right-24 top-36 text-cyan-400" delay="0.4s" />
            <div className="absolute left-1/2 top-24 -translate-x-1/2 text-blue-300">
              <div className="retro-error-spark" style={{ animationDelay: "0.8s" }}>
                <Sparkles className="size-4" />
              </div>
            </div>

            <div className="absolute left-14 bottom-24 h-[230px] w-[180px]">
              <Penguin
                className="retro-error-bob absolute inset-0"
                accentClass="bg-cyan-300"
                accessory={
                  <div className="retro-error-sway absolute right-[-6px] top-[120px] flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-xl">
                    <RefreshCw className="size-7 text-sky-600" />
                  </div>
                }
              />
            </div>

            <div className="absolute right-14 bottom-16 h-[250px] w-[190px]">
              <Penguin
                className="retro-error-bob-delayed absolute inset-0"
                accentClass="bg-amber-300"
                accessory={
                  <div className="retro-error-sway absolute left-[-6px] top-[132px] rounded-[24px] bg-slate-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-sky-100 shadow-xl">
                    Fixing feed
                  </div>
                }
              />
            </div>

            <div className="absolute left-1/2 top-[148px] -translate-x-1/2">
              <div className="w-[230px] rounded-[28px] border border-sky-100 bg-white/90 px-5 py-4 text-center shadow-[0_25px_80px_-42px_rgba(8,47,73,0.45)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">RetroPick Alert</div>
                <div className="mt-2 text-lg font-black tracking-[-0.02em] text-slate-900">Pudgy Penguins caught the error.</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">The page will recover faster after a reload.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
