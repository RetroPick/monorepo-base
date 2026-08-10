import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import LegalDocumentPage from "./LegalDocumentPage";

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

vi.mock("@/content/legalDocuments", () => ({
  getLegalDocument: (kind: "terms" | "privacy") => ({
    kind,
    title: kind === "terms" ? "Terms of Use" : "Privacy Policy",
    markdown: kind === "terms" ? "# Terms of Use\n\nTerms body." : "# Privacy Policy\n\nPrivacy body.",
  }),
}));

describe("LegalDocumentPage", () => {
  it("renders terms content inside the app shell", () => {
    render(
      <MemoryRouter>
        <LegalDocumentPage kind="terms" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeInTheDocument();
    expect(screen.getByText("Terms body.")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders privacy content", () => {
    render(
      <MemoryRouter>
        <LegalDocumentPage kind="privacy" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText("Privacy body.")).toBeInTheDocument();
  });
});
