import { fetchFeedRegistry, fetchOracleHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OraclePage() {
  let feedsErr: string | null = null;
  let healthErr: string | null = null;
  let health: Awaited<ReturnType<typeof fetchOracleHealth>> | null = null;
  let registry: Awaited<ReturnType<typeof fetchFeedRegistry>> | null = null;

  try {
    health = await fetchOracleHealth();
  } catch {
    healthErr = "Failed to load oracle health stub.";
  }

  try {
    registry = await fetchFeedRegistry();
  } catch (e) {
    feedsErr = e instanceof Error ? e.message : "Failed to load feed registry.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Oracle</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Curated Base Sepolia Chainlink proxies (static registry) and indexer health (pipeline placeholder).
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          On-chain validation & adapter probes live in{" "}
          <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-300">
            ./scripts/RETRODEPLOYER feeds discover
          </code>{" "}
          / <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-300">feeds fix-adapter</code>.
        </p>
      </div>

      {feedsErr ? (
        <p className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {feedsErr}
        </p>
      ) : null}

      {registry ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-medium text-zinc-200">Feed registry</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Network {registry.network} · chain {registry.chainId} · {registry.feeds.length} entries · {registry.source}
          </p>
          {registry.registryNote ? <p className="mt-1 text-xs text-zinc-500">{registry.registryNote}</p> : null}
          {registry.environmentWarning ? (
            <p className="mt-2 text-xs text-amber-200">{registry.environmentWarning}</p>
          ) : null}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-2 pr-2">Label</th>
                  <th className="py-2 pr-2">Proxy</th>
                  <th className="py-2 pr-2">Class</th>
                  <th className="py-2 pr-2">Delay (s)</th>
                </tr>
              </thead>
              <tbody>
                {registry.feeds.map((f) => (
                  <tr key={f.proxyAddress} className="border-b border-zinc-800/80">
                    <td className="py-1.5 pr-2 font-medium text-zinc-200">{f.label}</td>
                    <td className="py-1.5 pr-2 font-mono text-[11px] text-sky-200/90">{f.proxyAddress}</td>
                    <td className="py-1.5 pr-2">{f.oracleClass}</td>
                    <td className="py-1.5 pr-2">{f.suggestedMaxDelaySeconds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Indexer / pipeline health</h2>
        {healthErr ? (
          <p className="mt-2 text-sm text-amber-200">{healthErr}</p>
        ) : health ? (
          <div className="mt-2 text-sm">
            <p className="text-zinc-300">{health.note}</p>
            <p className="mt-2 text-xs text-zinc-500">
              source: <code>{health.source}</code> · feed rows:{" "}
              {Array.isArray(health.feeds) ? health.feeds.length : 0}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              When <code>retropick-index</code> populates <code>oracle_readings</code> / <code>oracle_health</code>, this section will
              show stale-feed and last-update context without per-minute RPC polling (see <code>.dev/pipeline</code>).
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
