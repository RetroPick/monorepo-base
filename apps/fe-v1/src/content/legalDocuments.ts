import privacyMarkdown from "../../../../.docs/production/PrivacyPolicy.md?raw";
import termsMarkdown from "../../../../.docs/production/Terms.md?raw";

export type LegalDocumentKind = "terms" | "privacy";

export type LegalDocument = {
  kind: LegalDocumentKind;
  title: string;
  markdown: string;
};

const LEGAL_DOCUMENTS: Record<LegalDocumentKind, LegalDocument> = {
  terms: {
    kind: "terms",
    title: "Terms of Use",
    markdown: termsMarkdown,
  },
  privacy: {
    kind: "privacy",
    title: "Privacy Policy",
    markdown: privacyMarkdown,
  },
};

export function getLegalDocument(kind: LegalDocumentKind): LegalDocument {
  return LEGAL_DOCUMENTS[kind];
}
