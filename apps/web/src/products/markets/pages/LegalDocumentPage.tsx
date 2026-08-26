import { useEffect, useState } from "react";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";

type LegalDocumentKind = "terms" | "privacy";

const legalDocumentMetadata: Record<LegalDocumentKind, { title: string }> = {
  terms: { title: "Terms of Use" },
  privacy: { title: "Privacy Policy" },
};

export interface LegalDocumentPageProps {
  kind: LegalDocumentKind;
}

export function LegalDocumentPage({ kind }: LegalDocumentPageProps) {
  const { title } = legalDocumentMetadata[kind];
  const [content, setContent] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/markets/legal/${kind}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Legal document request failed: ${response.status}`);
        return response.text();
      })
      .then(setContent)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(true);
      });

    return () => controller.abort();
  }, [kind]);

  return (
    <MarketsAppShell title={title} hideBottomNav>
      <article className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {error ? <p className="mt-4 text-sm text-muted-foreground">This document is temporarily unavailable.</p> : null}
        {!content && !error ? <p className="mt-4 text-sm text-muted-foreground">Loading {title.toLowerCase()}…</p> : null}
        {content ? <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{content}</pre> : null}
      </article>
    </MarketsAppShell>
  );
}

export default LegalDocumentPage;
