import Link from "next/link";

import { fetchGlobalState } from "@/lib/api";
import { publicClient } from "@/lib/chain";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let gs: Awaited<ReturnType<typeof fetchGlobalState>> | null = null;
  let err: string | null = null;
  let chainHead: bigint | null = null;
  try {
    gs = await fetchGlobalState();
  } catch {
    err = "Could not load global state.";
  }
  try {
    chainHead = await publicClient.getBlockNumber();
  } catch {
    /* optional */
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ops summary</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Read-only view of indexer projections and keeper tables. No
          authentication in MVP — run behind VPN or a reverse proxy in
          production.
        </p>
      </div>

      {err ? (
        <p className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {err}
        </p>
      ) : null}

      {chainHead != null ? (
        <p className="text-xs text-zinc-500">
          RPC chain head (viem):{" "}
          <span className="font-mono text-zinc-300">{chainHead.toString()}</span>
        </p>
      ) : null}

      {gs ? (
        <>
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
            <h2 className="font-medium text-zinc-300">Counts</h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Templates</dt>
                <dd className="font-mono text-lg text-zinc-100">
                  {gs.counts.templates}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Rolling halted</dt>
                <dd className="font-mono text-lg text-zinc-100">
                  {gs.counts.rollingHalted}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Open incidents</dt>
                <dd className="font-mono text-lg text-zinc-100">
                  {gs.counts.openIncidents}
                </dd>
              </div>
            </dl>
            {gs.liveFieldsNote ? (
              <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                {gs.liveFieldsNote}
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Sections
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { href: "/templates", label: "Templates", desc: "Markets + ledger" },
                { href: "/keeper", label: "Keeper", desc: "Schedule & executions" },
                { href: "/incidents", label: "Incidents", desc: "Open / historical" },
                { href: "/oracle", label: "Oracle", desc: "Placeholder health" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition hover:border-zinc-600 hover:bg-zinc-900"
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{item.desc}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
