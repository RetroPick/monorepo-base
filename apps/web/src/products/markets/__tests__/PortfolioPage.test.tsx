import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { PortfolioPage } from "../pages/PortfolioPage";

vi.mock("../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => ({ isSessionAuthenticated: false }),
}));

vi.mock("../trading/components/TradingLifecyclePanel", () => ({
  TradingLifecyclePanel: () => <p>Trading lifecycle panel</p>,
}));

vi.mock("../components/shell/MarketsAppShell", () => ({
  MarketsAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderPortfolio() {
  return render(
    <MemoryRouter initialEntries={["/markets/portfolio"]}>
      <PortfolioPage />
    </MemoryRouter>,
  );
}

describe("PortfolioPage", () => {
  it("does not render guest fixtures and asks an unauthenticated user to sign in", () => {
    renderPortfolio();
    expect(screen.getByText("Trading lifecycle panel")).toBeInTheDocument();
    expect(screen.getByText(/sign in to view your private trading lifecycle/i)).toBeInTheDocument();
    expect(screen.queryByText(/Guest preview/i)).not.toBeInTheDocument();
  });
});
