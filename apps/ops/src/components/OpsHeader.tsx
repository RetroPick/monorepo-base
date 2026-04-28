import type { OpsGlobalState } from "@/lib/api";

export function OpsHeader({ globalState }: { globalState: OpsGlobalState | null }) {
  const env = globalState?.environment;
  const proxy = globalState?.contracts.marketEngineProxy;
  const idx = globalState?.indexer;

  return (
    <div className="border-b border-[color:var(--color-mainBorder)] bg-[color:var(--color-primaryBg)]">
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-placeholderText)]">
            Environment
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--color-secondaryText)]">
            {env ? (
              <>
                <span>
                  <span className="text-[color:var(--color-placeholderText)]">env </span>
                  <span className="font-mono text-[color:var(--color-primaryText)]">{env.name}</span>
                </span>
                <span>
                  <span className="text-[color:var(--color-placeholderText)]">chain </span>
                  <span className="font-mono text-[color:var(--color-primaryText)]">{env.chainId}</span>
                </span>
              </>
            ) : (
              <span className="text-amber-300">Config unavailable</span>
            )}
            {proxy ? (
              <span className="max-w-[min(100%,28rem)] truncate font-mono text-[color:var(--color-secondaryText)]" title={proxy}>
                proxy {proxy}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-secondaryText)]">
          {idx ? (
            <>
              <span>
                indexed block{" "}
                <span className="font-mono text-[color:var(--color-primaryText)]">{idx.lastIndexedBlock}</span>
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
    </div>
  );
}
