import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchLiveTemplate, fetchTemplateState } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: { templateId: string };
}) {
  const { templateId } = params;
  let state: Awaited<ReturnType<typeof fetchTemplateState>> | null = null;
  try {
    state = await fetchTemplateState(templateId);
  } catch {
    notFound();
  }

  if (!state) notFound();

  const enc = encodeURIComponent(state.templateId);

  let live: Awaited<ReturnType<typeof fetchLiveTemplate>> | null = null;
  let liveErr: string | null = null;
  try {
    live = await fetchLiveTemplate(templateId);
  } catch {
    liveErr = "Live template view unavailable (RPC or template id).";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/templates"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Templates
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{state.slug}</h1>
        <p className="mt-1 font-mono text-xs text-zinc-500 break-all">
          {state.templateId}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Indexed (Postgres)
        </h2>
      <dl className="mt-2 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Initialized</dt>
          <dd className="font-mono text-zinc-200">{String(state.initialized)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Rolling phase</dt>
          <dd className="font-mono text-zinc-200">{state.rollingPhase}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Halt reason</dt>
          <dd className="font-mono text-zinc-200">{state.rollingHaltReason}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Execution mode</dt>
          <dd className="font-mono text-zinc-200">{state.executionMode}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Oracle max delay (s)</dt>
          <dd className="font-mono text-zinc-200">
            {state.oracleMaxDelaySeconds}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Oracle max conf. (bps)</dt>
          <dd className="font-mono text-zinc-200">
            {state.oracleMaxConfidenceBps}
          </dd>
        </div>
        {state.activeEpochId != null ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Active epoch</dt>
            <dd>
              <Link
                href={`/templates/${enc}/epochs/${state.activeEpochId}`}
                className="font-mono text-sky-400 hover:underline"
              >
                {state.activeEpochId}
              </Link>
            </dd>
          </div>
        ) : null}
        {state.lastResolvedEpochId != null ? (
          <div>
            <dt className="text-zinc-500">Last resolved epoch</dt>
            <dd className="font-mono text-zinc-200">
              {state.lastResolvedEpochId}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500">Last indexed block</dt>
          <dd className="font-mono text-zinc-200">{state.lastIndexedBlock}</dd>
        </div>
      </dl>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Live RPC (getOperatorTemplateView)
        </h2>
        {liveErr ? (
          <p className="mt-2 text-sm text-amber-300">{liveErr}</p>
        ) : live ? (
          <div className="mt-2 space-y-2 rounded-lg border border-sky-900/50 bg-sky-950/20 p-4 text-xs">
            <p className="text-zinc-500">
              Block{" "}
              <span className="font-mono text-zinc-300">{live.blockNumber}</span>
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["userOpsBlocked", live.data.userOpsBlocked],
                  ["unsafeToUnpauseForTemplate", live.data.unsafeToUnpauseForTemplate],
                  ["rollingPhase", live.data.rollingPhase],
                  ["rollingHaltReason", live.data.rollingHaltReason],
                  ["activeEpochId", live.data.activeEpochId],
                  ["lastResolvedEpochId", live.data.lastResolvedEpochId],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="font-mono text-zinc-200">{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
            <details className="text-zinc-500">
              <summary className="cursor-pointer text-zinc-400">Full JSON</summary>
              <pre className="mt-2 max-h-64 overflow-auto text-[11px] text-zinc-400">
                {JSON.stringify(live.data, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </section>
    </div>
  );
}
