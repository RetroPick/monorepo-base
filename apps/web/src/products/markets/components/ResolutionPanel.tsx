import type { MarketDetail } from "@retropick/polymarket";

type ResolutionRule = MarketDetail["resolution"];

interface ResolutionPanelProps {
  resolution: ResolutionRule;
}

export function ResolutionPanel({ resolution }: ResolutionPanelProps) {
  return (
    <section aria-label="Resolution rules" className="rounded-2xl border border-border bg-card p-5 text-sm">
      <h3 className="font-medium">Resolution rules</h3>
      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{resolution.description}</p>
      {resolution.sources.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resolution sources
          </h4>
          <ul className="mt-2 space-y-1" role="list">
            {resolution.sources.map((source) => (
              <li key={`${source.name}-${source.url ?? ""}`}>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {source.name}
                  </a>
                ) : (
                  <span>{source.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <footer className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        {resolution.contentHash ? <p>Content hash: {resolution.contentHash}</p> : null}
        {resolution.updatedAt ? (
          <p>Updated: {new Date(resolution.updatedAt).toLocaleString()}</p>
        ) : null}
      </footer>
    </section>
  );
}
