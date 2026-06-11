"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getAddress, isAddress, keccak256, toBytes } from "viem";

import { ExplainStepDialog } from "@/components/ExplainStepDialog";
import {
  CONDITION_OPTIONS,
  EXECUTION_MODE_OPTIONS,
  MARKET_TYPE_OPTIONS,
  ORACLE_CLASS_OPTIONS,
  TEMPLATE_ORACLE_KIND_OPTIONS,
  THRESHOLD_RULE_OPTIONS,
  validateTemplateConstraints,
} from "@/lib/marketLabels";
import { proxyAddressToFeedId } from "@/lib/feedId";
import {
  apiBase,
  fetchFeedRegistry,
  fetchLiveTemplate,
  fetchTemplateState,
  postTxPrepare,
  type OpsFeedEntry,
  type OpsTemplateState,
  type TxPrepareResponse,
} from "@/lib/api";

function templateIdFromSlug(slug: string): `0x${string}` | null {
  const s = slug.trim();
  if (!s) return null;
  return keccak256(toBytes(s));
}

function toUnixSeconds(isoLocal: string): number {
  return Math.floor(new Date(isoLocal).getTime() / 1000);
}

type UpsertForm = {
  slug: string;
  assetSymbol: string;
  oracleFeedId: string;
  marketType: number;
  condition: number;
  thresholdRule: number;
  active: boolean;
  outcomeCount: number;
  absoluteThresholdValueE8: string;
  switchFeeBps: number;
  settlementFeeBps: number;
  allowMultiSidePositions: boolean;
  executionMode: number;
  rollingIntervalSeconds: number;
  rollingBufferSeconds: number;
  oracleMaxDelaySeconds: number;
  oracleMaxConfidenceBps: number;
  templateOracleKind: number;
  oracleClass: number;
  eventOracle: string;
  cascadeDownward: boolean;
  anchorPriceE8: string;
  spreadToleranceBps: number;
};

const defaultUpsert = (): UpsertForm => ({
  slug: "",
  assetSymbol: "ETH",
  oracleFeedId:
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  marketType: 1,
  condition: 0,
  thresholdRule: 1,
  active: true,
  outcomeCount: 2,
  absoluteThresholdValueE8: "10000000000",
  switchFeeBps: 0,
  settlementFeeBps: 75,
  allowMultiSidePositions: true,
  executionMode: 0,
  rollingIntervalSeconds: 0,
  rollingBufferSeconds: 0,
  oracleMaxDelaySeconds: 0,
  oracleMaxConfidenceBps: 0,
  templateOracleKind: 0,
  oracleClass: 0,
  eventOracle: "0x0000000000000000000000000000000000000000",
  cascadeDownward: false,
  anchorPriceE8: "0",
  spreadToleranceBps: 0,
});

function upsertToJSON(f: UpsertForm): Record<string, unknown> {
  return {
    slug: f.slug.trim(),
    assetSymbol: f.assetSymbol.trim(),
    oracleFeedId: f.oracleFeedId.trim(),
    marketType: f.marketType,
    condition: f.condition,
    thresholdRule: f.thresholdRule,
    active: f.active,
    outcomeCount: f.outcomeCount,
    absoluteThresholdValueE8: f.absoluteThresholdValueE8,
    switchFeeBps: f.switchFeeBps,
    settlementFeeBps: f.settlementFeeBps,
    allowMultiSidePositions: f.allowMultiSidePositions,
    executionMode: f.executionMode,
    rollingIntervalSeconds: f.rollingIntervalSeconds,
    rollingBufferSeconds: f.rollingBufferSeconds,
    oracleMaxDelaySeconds: f.oracleMaxDelaySeconds,
    oracleMaxConfidenceBps: f.oracleMaxConfidenceBps,
    templateOracleKind: f.templateOracleKind,
    oracleClass: f.oracleClass,
    eventOracle: f.eventOracle.trim(),
    cascadeDownward: f.cascadeDownward,
    anchorPriceE8: f.anchorPriceE8,
    spreadToleranceBps: f.spreadToleranceBps,
  };
}

function PrepareOutput({ title, res, err }: { title: string; res: TxPrepareResponse | null; err: string | null }) {
  if (!res && !err) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-zinc-400">{title}</div>
      {err ? <p className="text-sm text-amber-300">{err}</p> : null}
      {res ? (
        <pre className="max-h-[420px] overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
          {JSON.stringify(res, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

const STEPS = [
  { n: 1, label: "Slug & id" },
  { n: 2, label: "Template" },
  { n: 3, label: "Initialize" },
  { n: 4, label: "Epochs" },
] as const;

export default function LaunchPage() {
  const [step, setStep] = useState(1);
  const [slug, setSlug] = useState("");
  const [upsert, setUpsert] = useState<UpsertForm>(() => defaultUpsert());
  const [epochId, setEpochId] = useState("1");
  const [openAtLocal, setOpenAtLocal] = useState("");
  const [lockAtLocal, setLockAtLocal] = useState("");
  const [resolveAtLocal, setResolveAtLocal] = useState("");
  const [feedQuery, setFeedQuery] = useState("");
  const [selectedFeedProxy, setSelectedFeedProxy] = useState("");
  const [explainKey, setExplainKey] = useState<string | null>(null);

  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [prepUpsert, setPrepUpsert] = useState<TxPrepareResponse | null>(null);
  const [prepUpsertErr, setPrepUpsertErr] = useState<string | null>(null);
  const [prepInit, setPrepInit] = useState<TxPrepareResponse | null>(null);
  const [prepInitErr, setPrepInitErr] = useState<string | null>(null);
  const [prepOpen, setPrepOpen] = useState<TxPrepareResponse | null>(null);
  const [prepOpenErr, setPrepOpenErr] = useState<string | null>(null);
  const [prepGenesis, setPrepGenesis] = useState<TxPrepareResponse | null>(null);
  const [prepGenesisErr, setPrepGenesisErr] = useState<string | null>(null);
  const [prepGenLock, setPrepGenLock] = useState<TxPrepareResponse | null>(null);
  const [prepGenLockErr, setPrepGenLockErr] = useState<string | null>(null);
  const [prepRoll, setPrepRoll] = useState<TxPrepareResponse | null>(null);
  const [prepRollErr, setPrepRollErr] = useState<string | null>(null);
  const [prepRollBatch, setPrepRollBatch] = useState<TxPrepareResponse | null>(null);
  const [prepRollBatchErr, setPrepRollBatchErr] = useState<string | null>(null);
  const [rollBatchInput, setRollBatchInput] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const templateId = useMemo(() => templateIdFromSlug(slug), [slug]);
  const templateQuery = useQuery({
    queryKey: ["ops-template-state", templateId],
    queryFn: () => fetchTemplateState(templateId!),
    enabled: Boolean(templateId),
  });
  const feedsQuery = useQuery({
    queryKey: ["ops-feeds-registry"],
    queryFn: () => fetchFeedRegistry(),
  });

  const st: OpsTemplateState | undefined = templateQuery.data;
  const templateValidation = validateTemplateConstraints({
    executionMode: upsert.executionMode,
    marketType: upsert.marketType,
    templateOracleKind: upsert.templateOracleKind,
  });

  const filteredFeeds: OpsFeedEntry[] = useMemo(() => {
    const list = feedsQuery.data?.feeds ?? [];
    const q = feedQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) => f.label.toLowerCase().includes(q) || f.proxyAddress.toLowerCase().includes(q));
  }, [feedsQuery.data?.feeds, feedQuery]);

  async function onLiveVerify() {
    if (!templateId) return;
    setLiveErr(null);
    setLiveNote(null);
    try {
      const live = await fetchLiveTemplate(templateId);
      setLiveNote(
        `Live block ${live.blockNumber}; template snapshot loaded. Compare slug and executionMode with expectations.`,
      );
    } catch (e) {
      setLiveErr(e instanceof Error ? e.message : "live fetch failed");
    }
  }

  async function onPrepareUpsert(e: React.FormEvent) {
    e.preventDefault();
    if (!templateValidation.ok) return;
    setPrepUpsert(null);
    setPrepUpsertErr(null);
    setLoading("upsert");
    try {
      const j = await postTxPrepare({ function: "upsertTemplate", args: [upsertToJSON(upsert)] });
      setPrepUpsert(j);
    } catch (x) {
      setPrepUpsertErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(null);
    }
  }

  async function onPrepareInitialize() {
    if (!templateId) return;
    setPrepInit(null);
    setPrepInitErr(null);
    setLoading("init");
    try {
      const j = await postTxPrepare({ function: "initializeMarket", args: [templateId] });
      setPrepInit(j);
    } catch (x) {
      setPrepInitErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(null);
    }
  }

  async function onPrepareOpenEpoch(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) return;
    setPrepOpen(null);
    setPrepOpenErr(null);
    setLoading("open");
    try {
      const openAt = toUnixSeconds(openAtLocal);
      const lockAt = toUnixSeconds(lockAtLocal);
      const resolveAt = toUnixSeconds(resolveAtLocal);
      if (!(openAt < lockAt && lockAt < resolveAt)) {
        throw new Error("require openAt < lockAt < resolveAt (unix)");
      }
      const eid = BigInt(epochId.trim());
      const maxU64 = BigInt("18446744073709551615");
      if (eid < BigInt(0) || eid > maxU64) {
        throw new Error("epochId must fit uint64");
      }
      const j = await postTxPrepare({
        function: "openEpoch",
        args: [templateId, eid.toString(), String(openAt), String(lockAt), String(resolveAt)],
      });
      setPrepOpen(j);
    } catch (x) {
      setPrepOpenErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(null);
    }
  }

  async function onPrepareGenesis() {
    if (!templateId) return;
    setPrepGenesis(null);
    setPrepGenesisErr(null);
    setLoading("genesis");
    try {
      const j = await postTxPrepare({ function: "genesisStartRolling", args: [templateId] });
      setPrepGenesis(j);
    } catch (x) {
      setPrepGenesisErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(null);
    }
  }

  async function onPrepareGenesisLock() {
    if (!templateId) return;
    setPrepGenLock(null);
    setPrepGenLockErr(null);
    setLoading("genlock");
    try {
      const j = await postTxPrepare({ function: "genesisLockRolling", args: [templateId] });
      setPrepGenLock(j);
    } catch (x) {
      setPrepGenLockErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(null);
    }
  }

  async function onPrepareExecuteRolling() {
    if (!templateId) return;
    setPrepRoll(null);
    setPrepRollErr(null);
    setLoading("roll");
    try {
      const j = await postTxPrepare({ function: "executeRollingRound", args: [templateId] });
      setPrepRoll(j);
    } catch (x) {
      setPrepRollErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(null);
    }
  }

  async function onPrepareRollingBatch() {
    setPrepRollBatch(null);
    setPrepRollBatchErr(null);
    setLoading("rollbatch");
    try {
      const lines = rollBatchInput
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const ids: `0x${string}`[] = [];
      for (const line of lines) {
        let h: `0x${string}`;
        if (line.length === 66 && line.startsWith("0x")) {
          h = line as `0x${string}`;
        } else if (/^[a-f0-9]{64}$/i.test(line)) {
          h = `0x${line}` as `0x${string}`;
        } else {
          throw new Error("each entry must be a 32-byte template id hex (0x + 64 hex)");
        }
        ids.push(h);
      }
      if (ids.length === 0) throw new Error("add at least one templateId");
      const j = await postTxPrepare({ function: "executeRollingRoundBatch", args: [ids] });
      setPrepRollBatch(j);
    } catch (x) {
      setPrepRollBatchErr(x instanceof Error ? x.message : "failed");
    } finally {
      setLoading(null);
    }
  }

  const nextEpochHint = useMemo(() => {
    if (!st?.initialized) return 1;
    if (st.activeEpochId && st.activeEpochId > 0) return null;
    return (st.lastResolvedEpochId ?? 0) + 1;
  }, [st]);

  function applyFeed(f: OpsFeedEntry) {
    if (!isAddress(f.proxyAddress)) return;
    const addr = getAddress(f.proxyAddress);
    setSelectedFeedProxy(f.proxyAddress);
    setUpsert((u) => ({
      ...u,
      oracleFeedId: proxyAddressToFeedId(addr),
      oracleClass: f.oracleClass,
      oracleMaxDelaySeconds: f.suggestedMaxDelaySeconds,
    }));
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Market launch</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Guided operator path for <code className="text-zinc-300">upsertTemplate</code> →{" "}
          <code className="text-zinc-300">initializeMarket</code> → manual or rolling epoch actions. Calldata only via{" "}
          <code className="text-zinc-500">{apiBase}</code>. See{" "}
          <code className="text-zinc-500">package/prediction-v2/.operator/.runbook.md</code>.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              step === s.n ? "bg-sky-950 text-sky-200 ring-1 ring-sky-800" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </nav>

      {step === 1 && (
        <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">1. Slug and template id</h2>
            <button
              type="button"
              onClick={() => setExplainKey("step1")}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Explain
            </button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="text-zinc-500">Slug</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setUpsert((u) => ({ ...u, slug: e.target.value.trim() }));
                }}
                placeholder="my-market-slug"
              />
            </label>
            <button
              type="button"
              onClick={onLiveVerify}
              disabled={!templateId}
              className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              Live template refresh
            </button>
          </div>
          <div className="font-mono text-xs text-zinc-400">
            templateId = keccak256(bytes(slug)): <span className="text-sky-300">{templateId ?? "—"}</span>
          </div>
          {templateQuery.isError ? (
            <p className="text-sm text-amber-300">Indexed state: failed to load (template may not exist yet).</p>
          ) : null}
          {st ? (
            <div className="grid gap-1 text-xs text-zinc-400 sm:grid-cols-2">
              <div>initialized: <span className="text-zinc-200">{String(st.initialized)}</span></div>
              <div>executionMode: <span className="text-zinc-200">{st.executionMode}</span> (0 Manual, 1 Rolling)</div>
              <div>activeEpochId: <span className="text-zinc-200">{st.activeEpochId ?? "—"}</span></div>
              <div>lastResolvedEpochId: <span className="text-zinc-200">{st.lastResolvedEpochId ?? "—"}</span></div>
            </div>
          ) : null}
          {liveNote ? <p className="text-xs text-zinc-500">{liveNote}</p> : null}
          {liveErr ? <p className="text-xs text-amber-300">{liveErr}</p> : null}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">2. Upsert template</h2>
            <button
              type="button"
              onClick={() => setExplainKey("step2")}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Explain
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Choose a Base Sepolia Chainlink proxy from the registry to set <code className="text-zinc-400">oracleFeedId</code>{" "}
            (padded address), <code className="text-zinc-400">oracleClass</code>, and suggested delay. Advanced arrays
            (composite, ladder) still require scripts.
          </p>
          {feedsQuery.isError ? (
            <p className="text-sm text-amber-300">Feed registry: {feedsQuery.error?.message ?? "failed"}</p>
          ) : null}
          {feedsQuery.data?.environmentWarning ? (
            <p className="text-xs text-amber-200">{feedsQuery.data.environmentWarning}</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-zinc-500">Search feeds</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={feedQuery}
                onChange={(e) => setFeedQuery(e.target.value)}
                placeholder="Filter by name or 0x address"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-zinc-500">Base Sepolia feed (optional)</span>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={selectedFeedProxy}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setSelectedFeedProxy("");
                    return;
                  }
                  const f = filteredFeeds.find((x) => x.proxyAddress === v) ?? feedsQuery.data?.feeds.find((x) => x.proxyAddress === v);
                  if (f) applyFeed(f);
                }}
              >
                <option value="">— Select to autofill —</option>
                {filteredFeeds.map((f) => (
                  <option key={f.proxyAddress} value={f.proxyAddress}>
                    {f.label} · {f.proxyAddress.slice(0, 10)}…
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!templateValidation.ok && (
            <ul className="list-inside list-disc text-sm text-amber-300">
              {templateValidation.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {templateValidation.warnings.length > 0 && (
            <ul className="list-inside list-disc text-xs text-amber-200/90">
              {templateValidation.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <form onSubmit={onPrepareUpsert} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-zinc-500">slug</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
                value={upsert.slug}
                onChange={(e) => {
                  setUpsert({ ...upsert, slug: e.target.value });
                  setSlug(e.target.value);
                }}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">assetSymbol</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.assetSymbol}
                onChange={(e) => setUpsert({ ...upsert, assetSymbol: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">marketType</span>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.marketType}
                onChange={(e) => setUpsert({ ...upsert, marketType: Number(e.target.value) })}
              >
                {MARKET_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.value})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-zinc-500">oracleFeedId (bytes32, left-padded proxy)</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
                value={upsert.oracleFeedId}
                onChange={(e) => {
                  setSelectedFeedProxy("");
                  setUpsert({ ...upsert, oracleFeedId: e.target.value });
                }}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">condition</span>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.condition}
                onChange={(e) => setUpsert({ ...upsert, condition: Number(e.target.value) })}
              >
                {CONDITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">thresholdRule</span>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.thresholdRule}
                onChange={(e) => setUpsert({ ...upsert, thresholdRule: Number(e.target.value) })}
              >
                {THRESHOLD_RULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">outcomeCount</span>
              <input
                type="number"
                min={1}
                max={8}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.outcomeCount}
                onChange={(e) => setUpsert({ ...upsert, outcomeCount: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-zinc-500">absoluteThresholdValueE8</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
                value={upsert.absoluteThresholdValueE8}
                onChange={(e) => setUpsert({ ...upsert, absoluteThresholdValueE8: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">switchFeeBps</span>
              <input
                type="number"
                min={0}
                max={200}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.switchFeeBps}
                onChange={(e) => setUpsert({ ...upsert, switchFeeBps: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">settlementFeeBps</span>
              <input
                type="number"
                min={0}
                max={200}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.settlementFeeBps}
                onChange={(e) => setUpsert({ ...upsert, settlementFeeBps: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={upsert.active}
                onChange={(e) => setUpsert({ ...upsert, active: e.target.checked })}
              />
              active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={upsert.allowMultiSidePositions}
                onChange={(e) => setUpsert({ ...upsert, allowMultiSidePositions: e.target.checked })}
              />
              allowMultiSidePositions
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">executionMode</span>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.executionMode}
                onChange={(e) => setUpsert({ ...upsert, executionMode: Number(e.target.value) })}
              >
                {EXECUTION_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">rollingIntervalSeconds</span>
              <input
                type="number"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.rollingIntervalSeconds}
                onChange={(e) => setUpsert({ ...upsert, rollingIntervalSeconds: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">rollingBufferSeconds</span>
              <input
                type="number"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.rollingBufferSeconds}
                onChange={(e) => setUpsert({ ...upsert, rollingBufferSeconds: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">oracleMaxDelaySeconds</span>
              <input
                type="number"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.oracleMaxDelaySeconds}
                onChange={(e) => setUpsert({ ...upsert, oracleMaxDelaySeconds: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">oracleMaxConfidenceBps</span>
              <input
                type="number"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.oracleMaxConfidenceBps}
                onChange={(e) => setUpsert({ ...upsert, oracleMaxConfidenceBps: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">templateOracleKind</span>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.templateOracleKind}
                onChange={(e) => setUpsert({ ...upsert, templateOracleKind: Number(e.target.value) })}
              >
                {TEMPLATE_ORACLE_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">oracleClass</span>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.oracleClass}
                onChange={(e) => setUpsert({ ...upsert, oracleClass: Number(e.target.value) })}
              >
                {ORACLE_CLASS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} title={o.hint}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-zinc-500 sm:col-span-2">
              {ORACLE_CLASS_OPTIONS.find((c) => c.value === upsert.oracleClass)?.hint}
            </p>
            <label className="text-sm sm:col-span-2">
              <span className="text-zinc-500">eventOracle (address, TRO only)</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
                value={upsert.eventOracle}
                onChange={(e) => setUpsert({ ...upsert, eventOracle: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={upsert.cascadeDownward}
                onChange={(e) => setUpsert({ ...upsert, cascadeDownward: e.target.checked })}
              />
              cascadeDownward
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">anchorPriceE8</span>
              <input
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.anchorPriceE8}
                onChange={(e) => setUpsert({ ...upsert, anchorPriceE8: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">spreadToleranceBps</span>
              <input
                type="number"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={upsert.spreadToleranceBps}
                onChange={(e) => setUpsert({ ...upsert, spreadToleranceBps: Number(e.target.value) })}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading !== null || !templateValidation.ok}
                className="rounded border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm text-sky-200 hover:bg-sky-900/40 disabled:opacity-50"
              >
                {loading === "upsert" ? "…" : "Prepare upsertTemplate"}
              </button>
            </div>
          </form>
          <PrepareOutput title="upsertTemplate" res={prepUpsert} err={prepUpsertErr} />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">3. Initialize market</h2>
            <button
              type="button"
              onClick={() => setExplainKey("step3")}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Explain
            </button>
          </div>
          <p className="text-xs text-zinc-500">Sets ledger state after template is written; use template id from step 1.</p>
          <button
            type="button"
            disabled={!templateId || loading !== null}
            onClick={onPrepareInitialize}
            className="rounded border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm text-sky-200 hover:bg-sky-900/40 disabled:opacity-50"
          >
            {loading === "init" ? "…" : "Prepare initializeMarket"}
          </button>
          <PrepareOutput title="initializeMarket" res={prepInit} err={prepInitErr} />
        </section>
      )}

      {step === 4 && (
        <>
          <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-200">4a. Manual — open epoch</h2>
              <button
                type="button"
                onClick={() => setExplainKey("step4manual")}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Explain
              </button>
            </div>
            {st ? (
              <div className="text-xs text-zinc-500">
                {st.activeEpochId && st.activeEpochId > 0 ? (
                  <span className="text-amber-200">
                    Active epoch {st.activeEpochId} — resolve or cancel before opening the next.
                  </span>
                ) : (
                  <>
                    Suggested next epochId: <span className="text-amber-200">{nextEpochHint ?? "—"}</span>
                  </>
                )}
              </div>
            ) : null}
            <form onSubmit={onPrepareOpenEpoch} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-zinc-500">epochId (uint64)</span>
                <input
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
                  value={epochId}
                  onChange={(e) => setEpochId(e.target.value)}
                />
              </label>
              <div className="text-xs text-zinc-500 sm:col-span-2">Local time → unix seconds in calldata.</div>
              <label className="text-sm sm:col-span-2">
                <span className="text-zinc-500">openAt</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  value={openAtLocal}
                  onChange={(e) => setOpenAtLocal(e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-zinc-500">lockAt</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  value={lockAtLocal}
                  onChange={(e) => setLockAtLocal(e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-zinc-500">resolveAt</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  value={resolveAtLocal}
                  onChange={(e) => setResolveAtLocal(e.target.value)}
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!templateId || loading !== null}
                  className="rounded border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm text-sky-200 hover:bg-sky-900/40 disabled:opacity-50"
                >
                  {loading === "open" ? "…" : "Prepare openEpoch"}
                </button>
              </div>
            </form>
            <PrepareOutput title="openEpoch" res={prepOpen} err={prepOpenErr} />
          </section>

          <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-200">4b. Rolling — lifecycle</h2>
              <button
                type="button"
                onClick={() => setExplainKey("step4rolling")}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Explain
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Order: genesis start → genesis lock (within window) → steady <code className="text-zinc-400">executeRollingRound</code>{" "}
              per interval. Halt recovery is in the runbook.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={!templateId || loading !== null}
                onClick={onPrepareGenesis}
                className="rounded border border-sky-800 bg-sky-950/40 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900/40 disabled:opacity-50"
              >
                {loading === "genesis" ? "…" : "Prepare genesisStartRolling"}
              </button>
              <button
                type="button"
                disabled={!templateId || loading !== null}
                onClick={onPrepareGenesisLock}
                className="rounded border border-sky-800 bg-sky-950/40 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900/40 disabled:opacity-50"
              >
                {loading === "genlock" ? "…" : "Prepare genesisLockRolling"}
              </button>
              <button
                type="button"
                disabled={!templateId || loading !== null}
                onClick={onPrepareExecuteRolling}
                className="rounded border border-sky-800 bg-sky-950/40 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900/40 disabled:opacity-50"
              >
                {loading === "roll" ? "…" : "Prepare executeRollingRound"}
              </button>
            </div>
            <PrepareOutput title="genesisStartRolling" res={prepGenesis} err={prepGenesisErr} />
            <PrepareOutput title="genesisLockRolling" res={prepGenLock} err={prepGenLockErr} />
            <PrepareOutput title="executeRollingRound" res={prepRoll} err={prepRollErr} />

            <div className="mt-4 border-t border-zinc-800 pt-3">
              <h3 className="text-xs font-medium text-zinc-400">Advanced: executeRollingRoundBatch</h3>
              <p className="mt-1 text-xs text-zinc-500">One line per templateId (0x + 64 hex) or space-separated.</p>
              <textarea
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200"
                rows={3}
                value={rollBatchInput}
                onChange={(e) => setRollBatchInput(e.target.value)}
                placeholder="0x…templateId1&#10;0x…templateId2"
              />
              <button
                type="button"
                disabled={loading !== null}
                onClick={onPrepareRollingBatch}
                className="mt-2 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
              >
                {loading === "rollbatch" ? "…" : "Prepare batch"}
              </button>
              <PrepareOutput title="executeRollingRoundBatch" res={prepRollBatch} err={prepRollBatchErr} />
            </div>
          </section>
        </>
      )}

      <ExplainStepDialog
        open={explainKey === "step1"}
        onClose={() => setExplainKey(null)}
        title="1. Slug and template id"
      >
        <p>
          The engine derives <code className="text-sky-300">templateId = keccak256(bytes(slug))</code>. The slug in{" "}
          <code className="text-sky-300">upsertTemplate</code> must match so operators and indexers see one logical market.
        </p>
        <p>
          Use <strong>Live template refresh</strong> to pull an RPC snapshot via the API (explicit, not polled). Compare with indexed rows if
          the template already exists.
        </p>
        <p className="text-xs text-zinc-500">
          Ref: <code>currentSmartContract.md</code> §0.3, <code>.operator/.runbook.md</code> environment inventory.
        </p>
      </ExplainStepDialog>

      <ExplainStepDialog
        open={explainKey === "step2"}
        onClose={() => setExplainKey(null)}
        title="2. Upsert template"
      >
        <p>
          Defines resolution math, fees, execution mode, and oracle routing. For Chainlink, <code className="text-sky-300">feedId</code> is
          the proxy encoded as a <code className="text-sky-300">bytes32</code> (use the feed picker to set padding and class).
        </p>
        <p>
          <strong>Rolling</strong> is only valid for certain market types; <strong>TrustedReporter</strong> never pairs with rolling.
          Convergence, Composite, Corridor, and Cascade are manual-only for rolling. Blockers here mirror on-chain <code>upsert</code> checks.
        </p>
        <p className="text-xs text-zinc-500">
          Ref: <code>.operator/.marketType.md</code>, <code>currentSmartContract.md</code> §3–4, §4.10.
        </p>
      </ExplainStepDialog>

      <ExplainStepDialog
        open={explainKey === "step3"}
        onClose={() => setExplainKey(null)}
        title="3. Initialize market"
      >
        <p>
          <code className="text-sky-300">initializeMarket(templateId)</code> marks the ledger ready; <code>rollingNextEpochId</code> starts
          at 1. No user epochs exist until you open the first round (manual or rolling genesis).
        </p>
        <p>Requires the template row to exist (after upsert). Sign with admin or worker per deployment.</p>
        <p className="text-xs text-zinc-500">Ref: <code>currentSmartContract.md</code> §0.3, runbook Initialize market.</p>
      </ExplainStepDialog>

      <ExplainStepDialog
        open={explainKey === "step4manual"}
        onClose={() => setExplainKey(null)}
        title="4a. Manual — open epoch"
      >
        <p>Manual mode uses discrete keeper txs: <code>openEpoch</code> → later <code>lockEpoch</code> → <code>resolveEpoch</code>.</p>
        <p>
          Enforce <code>openAt &lt; lockAt &lt; resolveAt</code>. Epoch id must be the next sequential id when no active unresolved epoch
          exists.
        </p>
        <p className="text-xs text-zinc-500">Ref: <code>currentSmartContract.md</code> §5, runbook Open epoch.</p>
      </ExplainStepDialog>

      <ExplainStepDialog
        open={explainKey === "step4rolling"}
        onClose={() => setExplainKey(null)}
        title="4b. Rolling — lifecycle"
      >
        <p>
          Rolling chains resolve → lock → open in <code className="text-sky-300">executeRollingRound</code> during steady state. Genesis
          requires <code>genesisStartRolling</code> first, then <code>genesisLockRolling</code> in the lock window.
        </p>
        <p>Halts on buffer miss, oracle failure, or wide confidence; recovery is in the runbook (pause, cancel, reset, genesis again).</p>
        <p className="text-xs text-zinc-500">Ref: <code>currentSmartContract.md</code> §6, <code>rollingMarket.md</code>, runbook Rolling.</p>
      </ExplainStepDialog>
    </div>
  );
}
