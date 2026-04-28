import { fetchKeeperExecutions, fetchKeeperSchedule } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function KeeperPage() {
  let schedule: Awaited<ReturnType<typeof fetchKeeperSchedule>> = [];
  let executions: Awaited<ReturnType<typeof fetchKeeperExecutions>> = [];
  let err: string | null = null;
  try {
    [schedule, executions] = await Promise.all([
      fetchKeeperSchedule(),
      fetchKeeperExecutions(),
    ]);
  } catch {
    err = "Failed to load keeper data.";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Keeper</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Schedule and execution log from PostgreSQL projections.
        </p>
      </div>

      {err ? (
        <p className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {err}
        </p>
      ) : null}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Schedule
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-zinc-500">
                    No rows.
                  </td>
                </tr>
              ) : (
                schedule.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-2 font-mono">{r.id}</td>
                    <td className="px-3 py-2">{r.action}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {r.scheduledAt ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Executions
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-zinc-500">
                    No rows.
                  </td>
                </tr>
              ) : (
                executions.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-2 font-mono">{r.id}</td>
                    <td className="px-3 py-2">{r.action}</td>
                    <td className="px-3 py-2">{r.result}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {r.executedAt ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
