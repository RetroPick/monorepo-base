import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const legalDocumentFiles = {
  terms: "Terms.md",
  privacy: "PrivacyPolicy.md",
} as const;

type LegalDocumentKind = keyof typeof legalDocumentFiles;

function isLegalDocumentKind(value: string): value is LegalDocumentKind {
  return value in legalDocumentFiles;
}

export async function GET(_request: Request, { params }: { params: { document: string } }) {
  if (!isLegalDocumentKind(params.document)) {
    return new NextResponse(null, { status: 404 });
  }

  const legalDocumentPath = path.resolve(process.cwd(), "../../docs/markets-v1/legal", legalDocumentFiles[params.document]);
  const content = await readFile(legalDocumentPath, "utf8");

  return new NextResponse(content, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
