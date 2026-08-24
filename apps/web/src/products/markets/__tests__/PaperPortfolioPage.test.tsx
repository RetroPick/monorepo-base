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
  it("labels fixture paper data as simulated rather than venue execution", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PaperPortfolioPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/simulated intelligence preview/i)).toBeInTheDocument();
    expect(screen.getByText(/paper portfolio only — not polymarket fills/i)).toBeInTheDocument();
    expect(screen.getByText(/virtual balance/i)).toBeInTheDocument();
    expect(screen.queryByText(/order submitted/i)).not.toBeInTheDocument();
  });
});
