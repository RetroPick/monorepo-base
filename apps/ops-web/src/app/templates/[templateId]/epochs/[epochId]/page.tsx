import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchEpoch, fetchLiveEpoch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function EpochPage({
  params,
}: {
  params: Promise<{ templateId: string; epochId: string }>;
}) {
  const { templateId, epochId } = await params;
  let e: Awaited<ReturnType<typeof fetchEpoch>> | null = null;
  try {
    e = await fetchEpoch(templateId, epochId);
  } catch {
    notFound();
  }
  if (!e) notFound();

  const enc = encodeURIComponent(templateId);

  let live: Awaited<ReturnType<typeof fetchLiveEpoch>> | null = null;
  let liveErr: string | null = null;
  try {
    live = await fetchLiveEpoch(templateId, epochId);
  } catch {
    liveErr = "Live epoch view unavailable (RPC or ids).";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/templates/${enc}`}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Template
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          Epoch {e.epochId}
        </h1>
        <p className="mt-1 font-mono text-xs text-zinc-500 break-all">
          {e.templateId}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Indexed (Postgres)
        </h2>
      <dl className="mt-2 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd className="font-mono text-zinc-200">{e.status}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Claimable</dt>
          <dd className="font-mono text-zinc-200">{String(e.claimable)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Ref mode</dt>
          <dd className="font-mono text-zinc-200">{e.refMode}</dd>
        </div>
        {e.winningOutcomeMask != null ? (
          <div>
            <dt className="text-zinc-500">Winning mask</dt>
            <dd className="font-mono text-zinc-200">{e.winningOutcomeMask}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500">Open</dt>
          <dd className="text-zinc-300">{e.openAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Lock</dt>
          <dd className="text-zinc-300">{e.lockAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Resolve</dt>
          <dd className="text-zinc-300">{e.resolveAt ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-zinc-500">Tx hashes</dt>
          <dd className="mt-1 space-y-1 font-mono text-xs text-zinc-400">
            <div>open {e.openTxHash ?? "—"}</div>
            <div>lock {e.lockTxHash ?? "—"}</div>
            <div>resolve {e.resolveTxHash ?? "—"}</div>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Last indexed block</dt>
          <dd className="font-mono text-zinc-200">{e.lastIndexedBlock}</dd>
        </div>
      </dl>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Live RPC (getEpochView)
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
                  ["status", live.data.status],
                  ["claimable", live.data.claimable],
                  ["totalPool", live.data.totalPool],
                  ["refundMode", live.data.refundMode],
                  ["winningOutcomeMask", live.data.winningOutcomeMask],
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
