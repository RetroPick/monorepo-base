import Link from "next/link";

import { fetchOpsTemplates } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  let rows: Awaited<ReturnType<typeof fetchOpsTemplates>> = [];
  let err: string | null = null;
  try {
    rows = await fetchOpsTemplates();
  } catch {
    err = "Failed to load templates.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Templates</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Indexed template + ledger fields. Source: <code className="text-zinc-300">indexed</code>.
        </p>
      </div>

      {err ? (
        <p className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {err}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Phase</th>
              <th className="px-3 py-2">Epochs</th>
              <th className="px-3 py-2">Template</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  No templates indexed.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.templateId} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-2">
                    <Link
                      href={`/templates/${r.templateId}`}
                      className="font-medium text-sky-400 hover:underline"
                    >
                      {r.slug}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-300">
                    {r.rollingPhase}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {r.activeEpochId != null ? (
                      <span>active {r.activeEpochId}</span>
                    ) : (
                      <span>—</span>
                    )}
                    {r.lastResolvedEpochId != null ? (
                      <span className="ml-2">
                        last {r.lastResolvedEpochId}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-zinc-500">
                    {r.templateId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
