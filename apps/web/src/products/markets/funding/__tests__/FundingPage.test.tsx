import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockSession = vi.fn();
const mockTradingWallets = vi.fn();
const mockSetup = vi.fn();
const mockBalance = vi.fn();

vi.mock("../../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => mockSession(),
}));

vi.mock("../../wallet/hooks/useMarketsTradingWallets", () => ({
  useMarketsTradingWallets: () => mockTradingWallets(),
}));

vi.mock("../hooks/useDepositWalletSetup", () => ({
  useDepositWalletSetup: () => mockSetup(),
}));

vi.mock("../hooks/useMarketsCollateralBalance", () => ({
  useMarketsCollateralBalance: () => mockBalance(),
}));

vi.mock("../../components/shell/MarketsAppShell", () => ({
  MarketsAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/FundingAccountSummary", () => ({
  FundingAccountSummary: () => <div data-testid="account-summary">Account summary</div>,
}));

import { FundingPage } from "../pages/FundingPage";

function renderFunding() {
  return render(
    <MemoryRouter>
      <FundingPage />
    </MemoryRouter>,
  );
}

describe("FundingPage", () => {
  beforeEach(() => {
    mockSession.mockReturnValue({ isSessionAuthenticated: false });
    mockTradingWallets.mockReturnValue({ accountWallet: undefined, state: "idle" });
    mockSetup.mockReturnValue({
      state: "unavailable",
      errorMessage: null,
      preview: null,
      linkedAccountWallet: undefined,
      createEnabled: false,
      canAttemptSetup: false,
      wrongChain: false,
      startPreview: vi.fn(),
      confirmAndSign: vi.fn(),
      resetPreview: vi.fn(),
    });
    mockBalance.mockReturnValue({
      state: "idle",
      data: null,
      errorMessage: null,
      refetch: vi.fn(),
    });
  });

  it("shows sandbox banner", () => {
    renderFunding();
    expect(screen.getByText(/Sandbox funding UX/i)).toBeInTheDocument();
  });

  it("does not show setup or balance panels without session", () => {
    renderFunding();
    expect(screen.queryByText(/Deposit wallet setup/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Tradable collateral \(pUSD\)/i })).not.toBeInTheDocument();
  });

  it("shows funding panels when session authenticated", () => {
    mockSession.mockReturnValue({ isSessionAuthenticated: true });
    mockSetup.mockReturnValue({
      state: "unavailable",
      errorMessage: null,
      preview: null,
      linkedAccountWallet: undefined,
      createEnabled: false,
      canAttemptSetup: false,
      wrongChain: false,
      startPreview: vi.fn(),
      confirmAndSign: vi.fn(),
      resetPreview: vi.fn(),
    });

    renderFunding();
    expect(screen.getByText(/Account setup unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tradable collateral \(pUSD\)/i })).toBeInTheDocument();
  });
});
