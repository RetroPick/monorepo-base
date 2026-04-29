import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getLegalDocument, type LegalDocumentKind } from "@/content/legalDocuments";

type LegalDocumentPageProps = {
  kind: LegalDocumentKind;
};

function trimLeadingDocumentHeading(markdown: string, title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.replace(new RegExp(`^#\\s+${escaped}\\s*\\n+`, "i"), "");
}

const markdownClassNames = {
  h1: "text-3xl font-semibold tracking-tight text-foreground",
  h2: "mt-8 text-xl font-semibold tracking-tight text-foreground",
  h3: "mt-6 text-lg font-semibold text-foreground",
  p: "mt-4 text-sm leading-7 text-muted-foreground",
  ul: "mt-4 list-disc space-y-2 pl-6 text-sm leading-7 text-muted-foreground",
  ol: "mt-4 list-decimal space-y-2 pl-6 text-sm leading-7 text-muted-foreground",
  li: "pl-1",
  hr: "my-6 border-border/70",
  strong: "font-semibold text-foreground",
  a: "text-primary underline underline-offset-4 hover:text-primary/90",
  blockquote: "mt-4 border-l-2 border-border/70 pl-4 text-sm italic text-muted-foreground",
  code: "rounded bg-muted px-1.5 py-0.5 text-[0.9em] text-foreground",
};

export default function LegalDocumentPage({ kind }: LegalDocumentPageProps) {
  const doc = getLegalDocument(kind);
  const markdown = trimLeadingDocumentHeading(doc.markdown, doc.title);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-[900px] px-5 pb-20 pt-10 sm:px-8 lg:pt-12">
        <div className="mb-6">
          <Link to="/app/markets/all" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Back to markets
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{doc.title}</h1>
        </div>

        <article className="rounded-2xl border border-border/70 bg-card/40 px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node: _node, ...props }) => <h1 className={markdownClassNames.h1} {...props} />,
              h2: ({ node: _node, ...props }) => <h2 className={markdownClassNames.h2} {...props} />,
              h3: ({ node: _node, ...props }) => <h3 className={markdownClassNames.h3} {...props} />,
              p: ({ node: _node, ...props }) => <p className={markdownClassNames.p} {...props} />,
              ul: ({ node: _node, ...props }) => <ul className={markdownClassNames.ul} {...props} />,
              ol: ({ node: _node, ...props }) => <ol className={markdownClassNames.ol} {...props} />,
              li: ({ node: _node, ...props }) => <li className={markdownClassNames.li} {...props} />,
              hr: ({ node: _node, ...props }) => <hr className={markdownClassNames.hr} {...props} />,
              strong: ({ node: _node, ...props }) => <strong className={markdownClassNames.strong} {...props} />,
              a: ({ node: _node, ...props }) => (
                <a
                  className={markdownClassNames.a}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              blockquote: ({ node: _node, ...props }) => (
                <blockquote className={markdownClassNames.blockquote} {...props} />
              ),
              code: ({ node: _node, ...props }) => <code className={markdownClassNames.code} {...props} />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </main>
      <Footer />
    </div>
  );
}
