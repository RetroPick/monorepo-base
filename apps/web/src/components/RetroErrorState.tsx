import { RefreshCw, Wrench } from "lucide-react";

interface RetroErrorStateProps {
  onRefresh: () => void;
}

export default function RetroErrorState({ onRefresh }: RetroErrorStateProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_52%,#f8fafc_100%)] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_38%)]" />
      <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="absolute bottom-[-8rem] right-[-4rem] h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-12 px-6 py-14 lg:flex-row lg:gap-16">
        <div className="w-full max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 shadow-sm backdrop-blur">
            RetroPick Repair Crew
          </div>

          <h1 className="mt-6 max-w-lg text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Something went wrong, but the bunny is already on it.
          </h1>

          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
            A RetroPick page tripped over an unexpected error. Our tiny repair rabbit is tightening bolts, checking wires, and
            getting the market machine back on track.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-18px_rgba(37,99,235,0.65)] transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              <RefreshCw className="size-4" />
              Refresh page
            </button>
            <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/75 px-5 py-3.5 text-sm font-medium text-slate-600 backdrop-blur">
              <Wrench className="size-4 text-cyan-600" />
              Diagnostics in progress
            </div>
          </div>
        </div>

        <div className="relative flex w-full max-w-xl items-center justify-center">
          <div className="relative h-[420px] w-full max-w-[420px]">
            <div className="absolute inset-x-4 bottom-0 h-24 rounded-[2rem] bg-[linear-gradient(180deg,rgba(191,219,254,0.25),rgba(59,130,246,0.1))]" />

            <div className="retro-error-float absolute right-8 top-6 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-semibold text-blue-700 shadow-lg">
              Patch mode
            </div>

            <div className="absolute left-10 top-16 h-48 w-48 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">RetroPick Core</div>
                  <div className="mt-1 text-sm font-bold text-slate-800">Market Engine</div>
                </div>
                <div className="retro-error-pulse flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Wrench className="size-4" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Stability</span>
                    <span>Recovering</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="retro-error-progress h-full w-3/4 rounded-full bg-[linear-gradient(90deg,#22c55e,#38bdf8,#2563eb)]" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="retro-error-blink h-12 rounded-2xl bg-emerald-100" />
                  <div className="retro-error-blink-delayed h-12 rounded-2xl bg-cyan-100" />
                  <div className="retro-error-blink h-12 rounded-2xl bg-blue-100" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-12 right-6 h-[260px] w-[220px]">
              <div className="retro-rabbit-bob absolute inset-x-0 bottom-0 mx-auto h-[220px] w-[180px]">
                <div className="absolute left-[24px] top-0 h-[96px] w-[42px] rounded-full bg-white shadow-md" />
                <div className="absolute right-[24px] top-0 h-[96px] w-[42px] rounded-full bg-white shadow-md" />
                <div className="absolute left-[34px] top-[12px] h-[68px] w-[18px] rounded-full bg-pink-200/80" />
                <div className="absolute right-[34px] top-[12px] h-[68px] w-[18px] rounded-full bg-pink-200/80" />

                <div className="absolute left-1/2 top-[54px] h-[118px] w-[128px] -translate-x-1/2 rounded-[45%] bg-white shadow-[0_28px_48px_-28px_rgba(15,23,42,0.5)]" />
                <div className="absolute left-[55px] top-[98px] h-3.5 w-3.5 rounded-full bg-slate-900" />
                <div className="absolute right-[55px] top-[98px] h-3.5 w-3.5 rounded-full bg-slate-900" />
                <div className="retro-error-nose absolute left-1/2 top-[116px] h-4 w-5 -translate-x-1/2 rounded-full bg-pink-300" />
                <div className="absolute left-1/2 top-[134px] h-7 w-[54px] -translate-x-1/2 rounded-b-[28px] rounded-t-[18px] border-4 border-white bg-pink-100" />
                <div className="absolute left-[34px] top-[118px] h-[2px] w-10 rounded-full bg-slate-300" />
                <div className="absolute left-[28px] top-[128px] h-[2px] w-11 rounded-full bg-slate-300" />
                <div className="absolute right-[34px] top-[118px] h-[2px] w-10 rounded-full bg-slate-300" />
                <div className="absolute right-[28px] top-[128px] h-[2px] w-11 rounded-full bg-slate-300" />

                <div className="absolute left-1/2 top-[154px] h-[62px] w-[92px] -translate-x-1/2 rounded-[40px] bg-white shadow-md" />
                <div className="absolute left-[52px] top-[176px] h-[56px] w-[34px] rounded-full bg-white shadow-md" />
                <div className="absolute right-[52px] top-[176px] h-[56px] w-[34px] rounded-full bg-white shadow-md" />

                <div className="retro-error-float-delayed absolute left-[18px] top-[162px] flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-lg">
                  <Wrench className="size-5" />
                </div>
              </div>
            </div>

            <div className="retro-error-float-delayed absolute bottom-24 left-4 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-lg backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Crew status</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">Cute rabbit working on the fix</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
