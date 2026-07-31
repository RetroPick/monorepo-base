import { RefreshCw, TriangleAlert } from "lucide-react";

interface RetroErrorStateProps {
  onRefresh: () => void;
}

/** CSS penguin (Pudgy-style silhouette) — decorative only; keeps a light bob animation. */
function PenguinMascot({ className }: { className?: string }) {
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
      <div className="absolute right-[12px] top-[92px] h-12 w-12 rounded-2xl bg-sky-400 shadow-md" />
    </div>
  );
}

export default function RetroErrorState({ onRefresh }: RetroErrorStateProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-background dark:text-foreground">
      <style>{`
        @keyframes error-penguin-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -8px, 0); }
        }
        .error-penguin-float {
          animation: error-penguin-float 4s ease-in-out infinite;
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(148,163,184,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(59,130,246,0.08),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:items-stretch lg:justify-between lg:gap-16 lg:py-10">
        <div className="flex w-full max-w-lg flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-border dark:bg-card dark:text-muted-foreground">
            <TriangleAlert className="size-3.5 text-amber-600 dark:text-amber-500" aria-hidden />
            Unable to load
          </div>

          <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-foreground">
            Something broke on our side
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-[17px] dark:text-muted-foreground">
            The app stopped rendering. Reloading usually fixes it—your wallet and session are not affected by this screen.
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:focus-visible:outline-primary"
            >
              <RefreshCw className="size-4" aria-hidden />
              Reload page
            </button>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-1 items-center justify-center lg:max-w-none">
          <div className="relative w-full max-w-[280px] rounded-2xl border border-slate-200 bg-white px-10 pb-10 pt-12 shadow-sm dark:border-border dark:bg-card">
            <div className="relative mx-auto h-[200px] w-[180px]">
              <div className="error-penguin-float absolute inset-0">
                <PenguinMascot className="absolute inset-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
