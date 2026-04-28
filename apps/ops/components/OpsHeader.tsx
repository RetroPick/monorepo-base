import Link from "next/link";

import type { OpsGlobalState } from "@/lib/api";

const nav = [
  { href: "/", label: "Summary" },
  { href: "/templates", label: "Templates" },
  { href: "/launch", label: "Launch" },
  { href: "/keeper", label: "Keeper" },
  { href: "/incidents", label: "Incidents" },
  { href: "/oracle", label: "Oracle" },
  { href: "/governance", label: "Governance" },
  { href: "/prepare", label: "Prepare tx" },
] as const;

export function OpsHeader({ globalState }: { globalState: OpsGlobalState | null }) {
  const env = globalState?.environment;
  const proxy = globalState?.contracts.marketEngineProxy;
  const idx = globalState?.indexer;

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight text-zinc-100">
            RetroPick · Operator
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {env ? (
              <>
                <span>
                  env{" "}
                  <span className="font-mono text-zinc-300">{env.name}</span>
                </span>
                <span>
                  chain{" "}
                  <span className="font-mono text-zinc-300">{env.chainId}</span>
                </span>
              </>
            ) : (
              <span className="text-amber-400/90">config unavailable</span>
            )}
            {proxy ? (
              <span className="max-w-[min(100%,28rem)] truncate" title={proxy}>
                proxy{" "}
                <span className="font-mono text-zinc-400">{proxy}</span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          {idx ? (
            <>
              <span>
                block{" "}
                <span className="font-mono text-zinc-300">
                  {idx.lastIndexedBlock}
                </span>
              </span>
              {idx.lastSyncAt ? (
                <span className="hidden sm:inline" title={idx.lastSyncAt}>
                  sync {idx.lastSyncAt}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <nav className="border-t border-zinc-800/80 bg-zinc-900/40">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-1 px-2 py-2">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
