import Link from "next/link";

import type { OpsGlobalState } from "@/lib/api";

export function OpsBanners({
  globalState,
  apiError,
}: {
  globalState: OpsGlobalState | null;
  apiError: boolean;
}) {
  if (apiError) {
    return (
      <div className="border-b border-amber-900/50 bg-amber-950/50 px-4 py-2 text-center text-sm text-amber-200">
        Could not load ops API. Start the backend or set{" "}
        <code className="rounded bg-zinc-900 px-1 font-mono text-xs">
          NEXT_PUBLIC_API_URL
        </code>
        .
      </div>
    );
  }

  if (!globalState) return null;

  const halted = globalState.counts.rollingHalted;
  const openInc = globalState.counts.openIncidents;

  if (halted === 0 && openInc === 0) {
    return (
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-4 py-2 text-center text-xs text-zinc-500">
        Indexed signals by default — use &quot;Refresh live (RPC)&quot; above for
        on-chain operator views (globalPaused, yield router, …).
      </div>
    );
  }

  return (
    <div className="space-y-1 border-b border-zinc-800">
      {halted > 0 ? (
        <div className="bg-rose-950/40 px-4 py-2 text-sm text-rose-200">
          <strong className="font-medium">{halted}</strong> template
          {halted === 1 ? "" : "s"} with rolling halted phase (indexed, phase 3).
          See{" "}
          <Link href="/templates" className="underline hover:text-white">
            templates
          </Link>
          .
        </div>
      ) : null}
      {openInc > 0 ? (
        <div className="bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
          <strong className="font-medium">{openInc}</strong> open incident
          {openInc === 1 ? "" : "s"}.{" "}
          <Link href="/incidents" className="underline hover:text-white">
            View incidents
          </Link>
          .
        </div>
      ) : null}
      <div className="bg-zinc-900/30 px-4 py-1.5 text-center text-xs text-zinc-500">
        Indexed signals only — verify on-chain before acting.
      </div>
    </div>
  );
}
