import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../components/shell/MarketsAppShell", () => ({
  MarketsAppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => ({ isSessionAuthenticated: false }),
}));

import { PaperPortfolioPage } from "../pages/PaperPortfolioPage";

describe("PaperPortfolioPage", () => {
  it("does not render fixture data unless an explicit development flag enables it", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PaperPortfolioPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/paper copy unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/virtual balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/order submitted/i)).not.toBeInTheDocument();
  });
});
