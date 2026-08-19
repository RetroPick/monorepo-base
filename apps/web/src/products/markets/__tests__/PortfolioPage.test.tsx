import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, isConnected: false, chainId: 137 }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
  useSignMessage: () => ({ signMessageAsync: vi.fn() }),
  useSwitchChain: () => ({ switchChain: vi.fn(), isPending: false }),
}));

vi.mock("../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => ({ isSessionAuthenticated: false }),
}));

vi.mock("../trading/components/TradingLifecyclePanel", () => ({
  TradingLifecyclePanel: () => <p>Trading lifecycle panel</p>,
}));

vi.mock("../components/shell/MarketsAppShell", () => ({
  MarketsAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../funding/components/FundingSection", () => ({
  FundingSection: () => <div>Funding Section</div>,
}));

import { PortfolioPage } from "../pages/PortfolioPage";

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
