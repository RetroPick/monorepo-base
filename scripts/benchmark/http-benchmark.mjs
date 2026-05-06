import { performance } from "node:perf_hooks";

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarize(name, durations, failures, statuses) {
  const sorted = [...durations].sort((a, b) => a - b);
  const total = sorted.reduce((sum, n) => sum + n, 0);
  return {
    name,
    requests: sorted.length + failures,
    successes: sorted.length,
    failures,
    statusCounts: statuses,
    minMs: Number((sorted[0] ?? 0).toFixed(2)),
    avgMs: Number((sorted.length ? total / sorted.length : 0).toFixed(2)),
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(percentile(sorted, 95).toFixed(2)),
    p99Ms: Number(percentile(sorted, 99).toFixed(2)),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(2)),
  };
}

async function runBenchmark({
  name,
  url,
  requests = 200,
  concurrency = 20,
  warmup = 20,
  headers = {},
}) {
  const durations = [];
  const statuses = {};
  let failures = 0;

  for (let i = 0; i < warmup; i += 1) {
    await fetch(url, { headers });
  }

  let next = 0;

  async function worker() {
    while (true) {
      const current = next;
      next += 1;
      if (current >= requests) return;

      const started = performance.now();
      try {
        const res = await fetch(url, { headers });
        await res.arrayBuffer();
        const elapsed = performance.now() - started;
        durations.push(elapsed);
        statuses[res.status] = (statuses[res.status] ?? 0) + 1;
        if (!res.ok) failures += 1;
      } catch {
        failures += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return summarize(name, durations, failures, statuses);
}

const baseUrl = process.env.BENCH_BASE_URL ?? "http://retropick-api:8080";
const templateId = process.env.BENCH_TEMPLATE_ID;
const epochId = process.env.BENCH_EPOCH_ID ?? "1";

if (!templateId) {
  console.error("BENCH_TEMPLATE_ID is required");
  process.exit(1);
}

const benchmarks = [
  {
    name: "markets_list",
    url: `${baseUrl}/api/v1/markets`,
  },
  {
    name: "market_detail",
    url: `${baseUrl}/api/v1/markets/${encodeURIComponent(templateId)}`,
  },
  {
    name: "probability_history",
    url: `${baseUrl}/api/v1/markets/${encodeURIComponent(templateId)}/probability-history?epochId=${encodeURIComponent(epochId)}`,
  },
  {
    name: "market_chart",
    url: `${baseUrl}/api/v1/markets/${encodeURIComponent(templateId)}/chart?interval=300&limit=240`,
  },
];

const results = [];
for (const benchmark of benchmarks) {
  results.push(await runBenchmark(benchmark));
}

console.log(JSON.stringify({
  baseUrl,
  templateId,
  epochId,
  measuredAt: new Date().toISOString(),
  requestsPerEndpoint: 200,
  concurrency: 20,
  warmupRequestsPerEndpoint: 20,
  results,
}, null, 2));
