import { Link } from "react-router-dom";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getLegalDocument, type LegalDocumentKind } from "@/content/legalDocuments";
import LegalMarkdownArticle from "./legal/LegalMarkdownArticle";

type LegalDocumentPageProps = {
  kind: LegalDocumentKind;
};

function trimLeadingDocumentHeading(markdown: string, title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.replace(new RegExp(`^#\\s+${escaped}\\s*\\n+`, "i"), "");
}

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
          <LegalMarkdownArticle markdown={markdown} />
        </article>
      </main>
      <Footer />
    </div>
  );
}
