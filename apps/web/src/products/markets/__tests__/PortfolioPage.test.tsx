import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/shared/providers/theme-provider";

import { PortfolioPage } from "../pages/PortfolioPage";

vi.mock("../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => ({ isSessionAuthenticated: false }),
}));

vi.mock("../trading/components/TradingLifecyclePanel", () => ({
  TradingLifecyclePanel: () => <p>Trading lifecycle panel</p>,
}));

function renderPortfolio() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/markets/portfolio"]}>
          <PortfolioPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
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
