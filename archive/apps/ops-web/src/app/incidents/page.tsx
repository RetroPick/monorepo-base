import { fetchIncidents } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  let rows: Awaited<ReturnType<typeof fetchIncidents>> = [];
  let err: string | null = null;
  try {
    rows = await fetchIncidents();
  } catch {
    err = "Failed to load incidents.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Incidents</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Latest incidents from the database (newest first).
        </p>
      </div>

      {err ? (
        <p className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {err}
        </p>
      ) : null}

      <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-zinc-500">
            No incidents.
          </li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="px-4 py-4 hover:bg-zinc-900/40">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{r.title}</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                  {r.severity}
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                  {r.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                #{r.id}
                {r.openedAt ? ` · ${r.openedAt}` : ""}
                {r.templateId ? (
                  <span className="ml-2 font-mono">{r.templateId}</span>
                ) : null}
              </div>
              {r.payload != null ? (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-zinc-900 p-2 text-xs text-zinc-400">
                  {JSON.stringify(r.payload, null, 2)}
                </pre>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
