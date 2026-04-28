export const apiBase =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

const base = apiBase;

export type OpsGlobalState = {
  source: string;
  environment: { name: string; chainId: number };
  contracts: { marketEngineProxy: string };
  indexer: {
    lastIndexedBlock: number;
    lastBlockHash?: string | null;
    lastSyncAt?: string | null;
    reorgDepth: number;
  };
  counts: {
    templates: number;
    rollingHalted: number;
    openIncidents: number;
  };
  liveProtocolFields: null;
  liveFieldsNote?: string;
};

export type OpsTemplateRow = {
  templateId: string;
  slug: string;
  marketType: number;
  outcomeCount: number;
  initialized: boolean;
  executionMode: number;
  rollingPhase: number;
  rollingHaltReason: number;
  lastIndexedBlock: number;
  templateUpdatedAt?: string | null;
  activeEpochId?: number;
  lastResolvedEpochId?: number;
  rollingNextEpochId?: number;
  haltedAtEpochId?: number;
};

export type OpsTemplateState = OpsTemplateRow & {
  oracleMaxDelaySeconds: number;
  oracleMaxConfidenceBps: number;
  ledgerUpdatedAt?: string | null;
};

export type OpsEpoch = {
  source: string;
  templateId: string;
  epochId: number;
  status: number;
  openAt: string | null;
  lockAt: string | null;
  resolveAt: string | null;
  openTxHash: string | null;
  lockTxHash: string | null;
  resolveTxHash: string | null;
  claimable: boolean;
  refMode: number;
  updatedAt: string | null;
  lastIndexedBlock: number;
  winningOutcomeMask?: number;
};

export type KeeperScheduleRow = {
  id: number;
  action: string;
  status: string;
  scheduledAt?: string;
  windowEndAt?: string;
  createdAt?: string;
  templateId?: string;
  epochId?: number;
};

export type KeeperExecutionRow = {
  id: number;
  action: string;
  result: string;
  executedAt?: string;
  templateId?: string;
  epochId?: number;
  txHash?: string;
  errorMessage?: string;
};

export type IncidentRow = {
  id: number;
  title: string;
  severity: string;
  status: string;
  payload: unknown;
  openedAt?: string;
  templateId?: string;
};

export async function fetchGlobalState() {
  const res = await fetch(`${base}/api/v1/ops/global-state`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("global-state");
  return res.json() as Promise<OpsGlobalState>;
}

export async function fetchHealth() {
  const res = await fetch(`${base}/api/v1/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("health");
  return res.json() as Promise<{
    ok: boolean;
    lastIndexedBlock: number;
    lastBlockHash?: string | null;
    lastSyncAt?: string | null;
  }>;
}

export async function fetchContracts() {
  const res = await fetch(`${base}/api/v1/config/contracts`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("contracts");
  return res.json() as Promise<{
    environment: string;
    chainId: number;
    contracts: { marketEngineProxy: string };
  }>;
}

export async function fetchOpsTemplates() {
  const res = await fetch(`${base}/api/v1/ops/templates`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("ops templates");
  const data = (await res.json()) as { templates: OpsTemplateRow[] };
  return data.templates;
}

export async function fetchTemplateState(templateId: string) {
  const id = templateId.startsWith("0x") ? templateId.slice(2) : templateId;
  const res = await fetch(
    `${base}/api/v1/ops/templates/0x${id}/state`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("template state");
  return res.json() as Promise<OpsTemplateState>;
}

export async function fetchEpoch(templateId: string, epochId: string) {
  const id = templateId.startsWith("0x") ? templateId.slice(2) : templateId;
  const res = await fetch(
    `${base}/api/v1/ops/templates/0x${id}/epochs/${epochId}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("epoch");
  return res.json() as Promise<OpsEpoch>;
}

export async function fetchKeeperSchedule(limit = 100) {
  const res = await fetch(
    `${base}/api/v1/ops/keeper/schedule?limit=${limit}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("keeper schedule");
  const data = (await res.json()) as { schedule: KeeperScheduleRow[] };
  return data.schedule;
}

export async function fetchKeeperExecutions(limit = 100) {
  const res = await fetch(
    `${base}/api/v1/ops/keeper/executions?limit=${limit}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("keeper executions");
  const data = (await res.json()) as { executions: KeeperExecutionRow[] };
  return data.executions;
}

export async function fetchIncidents(limit = 100) {
  const res = await fetch(`${base}/api/v1/ops/incidents?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("incidents");
  const data = (await res.json()) as { incidents: IncidentRow[] };
  return data.incidents;
}

export async function fetchOracleHealth() {
  const res = await fetch(`${base}/api/v1/ops/oracle/health`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("oracle health");
  return res.json() as Promise<{
    feeds: unknown[];
    note: string;
    source: string;
  }>;
}

/** Live RPC (eth_call) — explicit refresh only; hits public RPC via backend. */
export type LiveEnvelope<T> = {
  source: "live";
  chainId: number;
  blockNumber: number;
  marketEngineProxy: string;
  data: T;
};

export type LiveGlobalData = {
  globalPaused: boolean;
  yieldRouter: string;
  yieldRouterDisabled: boolean;
  yieldRouterFailureCount: number;
  totalRoutedPrincipal: string;
  totalUnreconciledRecovered: string;
  admin: string;
  treasury: string;
  workerAuthority: string;
  priceOracle: string;
  rateOracle: string;
  smartDataOracle: string;
  macroOracle: string;
  equityOracle: string;
};

export async function fetchLiveGlobal() {
  const res = await fetch(`${base}/api/v1/ops/live/global`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("live global");
  return res.json() as Promise<LiveEnvelope<LiveGlobalData>>;
}

export async function fetchLiveTemplate(templateId: string) {
  const id = templateId.startsWith("0x") ? templateId : `0x${templateId}`;
  const enc = encodeURIComponent(id);
  const res = await fetch(`${base}/api/v1/ops/live/templates/${enc}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("live template");
  return res.json() as Promise<LiveEnvelope<Record<string, unknown>>>;
}

export async function fetchLiveEpoch(templateId: string, epochId: string) {
  const id = templateId.startsWith("0x") ? templateId : `0x${templateId}`;
  const enc = encodeURIComponent(id);
  const res = await fetch(
    `${base}/api/v1/ops/live/templates/${enc}/epochs/${epochId}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("live epoch");
  return res.json() as Promise<LiveEnvelope<Record<string, unknown>>>;
}

export async function fetchLiveSelector(selector: string) {
  const s = selector.startsWith("0x") ? selector.slice(2) : selector;
  const res = await fetch(
    `${base}/api/v1/ops/live/dispatcher/selector/0x${s}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("live selector");
  return res.json() as Promise<{
    source: string;
    chainId: number;
    blockNumber: number;
    marketEngineProxy: string;
    selector: string;
    module: string;
    immutableSelector: boolean;
  }>;
}

export type TxPrepareResponse = {
  target: string;
  chainId: number;
  abi: string;
  function: string;
  calldata: string;
  value: string;
  requiredRole: string;
  runbookRef: string;
  expectedEvents: string[];
  validationChecklist: string[];
  productionApproval: string;
  environment: string;
};

export type OpsFeedEntry = {
  proxyAddress: string;
  label: string;
  category: string;
  oracleClass: number;
  suggestedMaxDelaySeconds: number;
  decimals?: number;
  sourceUrl?: string;
};

export type OpsFeedRegistryResponse = {
  network: string;
  chainId: number;
  feeds: OpsFeedEntry[];
  source: string;
  registryNote?: string;
  environmentWarning?: string;
};

export async function fetchFeedRegistry(params?: { oracleClass?: number }) {
  const u = new URL(`${base}/api/v1/ops/feeds`);
  u.searchParams.set("network", "base-sepolia");
  if (params?.oracleClass !== undefined) {
    u.searchParams.set("oracleClass", String(params.oracleClass));
  }
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "feeds");
  }
  return res.json() as Promise<OpsFeedRegistryResponse>;
}

export type TxPrepareMetaRow = {
  function: string;
  requiredRole: string;
  runbookRef: string;
  expectedEvents: string[];
  validationChecklist: string[];
};

export async function fetchTxPrepareMeta() {
  const res = await fetch(`${base}/api/v1/ops/tx/prepare/meta`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("prepare meta");
  return res.json() as Promise<{ functions: TxPrepareMetaRow[] }>;
}

export async function postFrontendVisibility(body: {
  action: "hide" | "unhide" | "list";
  templateId?: string;
}) {
  const res = await fetch(`${base}/api/v1/ops/frontend-visibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "frontend-visibility failed");
  }
  return res.json() as Promise<
    | { hidden: { templateId: string; hiddenAt?: string | null }[] }
    | { ok: boolean; action: string; templateId: string }
  >;
}

export async function postTxPrepare(body: {
  function: string;
  args: unknown[];
}) {
  const res = await fetch(`${base}/api/v1/ops/tx/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "prepare failed");
  }
  return res.json() as Promise<TxPrepareResponse>;
}
