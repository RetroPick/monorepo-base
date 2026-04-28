import Link from "next/link";

import {
  fetchGlobalState,
  fetchIncidents,
  fetchKeeperExecutions,
  fetchKeeperSchedule,
  fetchOpsTemplates,
} from "@/lib/api";

export const dynamic = "force-dynamic";

/** Read-only aggregates mirroring RETRODEPLOYER `monitor *` themes without scraping CLI. */
export default async function MonitorPage() {
  let gs: Awaited<ReturnType<typeof fetchGlobalState>> | null = null;
  let templates: Awaited<ReturnType<typeof fetchOpsTemplates>> = [];
  let schedule: Awaited<ReturnType<typeof fetchKeeperSchedule>> = [];
  let executions: Awaited<ReturnType<typeof fetchKeeperExecutions>> = [];
  let incidents: Awaited<ReturnType<typeof fetchIncidents>> = [];
  let err: string | null = null;

  try {
    [gs, templates, schedule, executions, incidents] = await Promise.all([
      fetchGlobalState(),
      fetchOpsTemplates(),
      fetchKeeperSchedule(50),
      fetchKeeperExecutions(20),
      fetchIncidents(50),
    ]);
  } catch {
    err = "One or more ops routes failed.";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-primaryText)]">Monitor</h1>
        <p className="mt-1 max-w-3xl text-sm text-[color:var(--color-secondaryText)]">
          Structured snapshot of indexer-backed routes (compare with{" "}
          <code className="rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-xs">
            ./scripts/RETRODEPLOYER monitor …
          </code>
          ). Refresh page to update.
        </p>
      </div>

      {err ? (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">{err}</p>
      ) : null}

      {gs ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Templates" value={String(gs.counts.templates)} />
          <StatCard label="Rolling halted" value={String(gs.counts.rollingHalted)} />
          <StatCard label="Open incidents" value={String(gs.counts.openIncidents)} />
          <StatCard label="Indexer block" value={String(gs.indexer.lastIndexedBlock)} />
        </section>
      ) : null}

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Trade-ready (indexed)</h2>
        <p className="mt-1 text-xs text-[color:var(--color-placeholderText)]">
          Initialized templates with an active epoch id (quick heuristic).
        </p>
        <ul className="mt-3 space-y-1 font-mono text-xs text-[color:var(--color-secondaryText)]">
          {templates.filter((t) => t.initialized && t.activeEpochId != null).length === 0 ? (
            <li>None matched.</li>
          ) : (
            templates
              .filter((t) => t.initialized && t.activeEpochId != null)
              .slice(0, 12)
              .map((t) => (
                <li key={t.templateId}>
                  <Link className="text-[color:var(--color-coloredLinkText)] hover:underline" href={`/templates/${t.templateId}`}>
                    {t.slug}
                  </Link>
                </li>
              ))
          )}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Keeper schedule</h2>
          <p className="text-xs text-[color:var(--color-placeholderText)]">{schedule.length} rows (limit 50)</p>
          <pre className="mt-2 max-h-48 overflow-auto text-[10px] text-[color:var(--color-secondaryText)]">
            {JSON.stringify(schedule.slice(0, 8), null, 2)}
          </pre>
        </div>
        <div className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Keeper executions</h2>
          <p className="text-xs text-[color:var(--color-placeholderText)]">{executions.length} rows (limit 20)</p>
          <pre className="mt-2 max-h-48 overflow-auto text-[10px] text-[color:var(--color-secondaryText)]">
            {JSON.stringify(executions.slice(0, 8), null, 2)}
          </pre>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--color-primaryText)]">Incidents</h2>
        <pre className="mt-2 max-h-56 overflow-auto text-[10px] text-[color:var(--color-secondaryText)]">
          {JSON.stringify(incidents.slice(0, 15), null, 2)}
        </pre>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)] px-4 py-3">
      <div className="text-xs text-[color:var(--color-placeholderText)]">{label}</div>
      <div className="mt-1 font-mono text-2xl text-[color:var(--color-primaryText)]">{value}</div>
    </div>
  );
}
