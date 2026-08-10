import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  deposit: vi.fn(),
  approveDepositSpending: vi.fn(),
  batchApproveAndDeposit: vi.fn(),
  depositApproved: vi.fn(),
  claimMany: vi.fn(),
  fetchUserPositions: vi.fn(),
  refetchUsdcAllowance: vi.fn().mockResolvedValue({ data: 0n }),
  switchSide: vi.fn(),
}));

const {
  deposit,
  approveDepositSpending,
  batchApproveAndDeposit,
  depositApproved,
  claimMany,
  fetchUserPositions,
  refetchUsdcAllowance,
  switchSide,
} = hoisted;

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({ address: "0x1111111111111111111111111111111111111111" as const }),
    useChainId: () => 84532,
  };
});

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useMarketEngine", () => ({
  useMarketEngine: () => ({
    usdcBalance: 250n * 10n ** 18n,
    usdcAllowance: 0n,
    refetchUsdcAllowance: hoisted.refetchUsdcAllowance,
    deposit: hoisted.deposit,
    approveDepositSpending: hoisted.approveDepositSpending,
    batchApproveAndDeposit: hoisted.batchApproveAndDeposit,
    depositApproved: hoisted.depositApproved,
    switchSide: hoisted.switchSide,
    claimMany: hoisted.claimMany,
    isApprovingDeposit: false,
    isBatchingDeposit: false,
    isDepositing: false,
    isClaiming: false,
    isSwitching: false,
  }),
}));

const W = 10n ** 18n;

vi.mock("@/lib/contracts/marketEngine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contracts/marketEngine")>();
  return {
    ...actual,
    useEpoch: () => ({
      data: {
        status: 1,
        timing: { openAt: 0n, lockAt: 9_999_999_999n, resolveAt: 9_999_999_999n },
        outcomePools: [60n * W, 40n * W] as const,
        totalPool: 100n * W,
        winningOutcomeMask: 0n,
        outcomeCount: 2,
        settlementFeeBps: 1000,
        feeOnLosingPool: true,
        refundMode: false,
        switchFeeBps: 100,
      },
      isSuccess: true,
      isFetching: false,
    }),
    useTemplateYieldView: () => ({
      data: {
        routerAssigned: true,
        routerDisabled: false,
        recoveryPending: false,
        yieldPath: 0,
        currentPrincipal: 50n * W,
        currentValue: 52n * W,
        unrealizedYieldAmount: 2n * W,
        yieldRatioE6: 40_000n,
        scaledPrincipal: 0n,
        stataShares: 0n,
        yieldFeeBpsCurrent: 500,
      },
      isLoading: false,
      isError: false,
    }),
  };
});

vi.mock("@/lib/api/retropickApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/retropickApi")>(
    "@/lib/api/retropickApi",
  );
  return {
    ...actual,
    fetchUserPositions: (...args: unknown[]) => hoisted.fetchUserPositions(...args),
  };
});

import { ManualTradeCard } from "./ManualTradeCard";

const tradeContext = {
  templateId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
  activeEpochId: 7n,
  outcomeCount: 2,
  rollingPhase: 2,
  rollingHaltReason: 0,
};

function renderCard() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ManualTradeCard
        outcomes={[
          { id: "0", label: "Yes", probability: 62 },
          { id: "1", label: "No", probability: 38 },
        ]}
        tradeContext={tradeContext}
      />
    </QueryClientProvider>,
  );
}

describe("ManualTradeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deposit.mockResolvedValue("0xdep");
    refetchUsdcAllowance.mockResolvedValue({ data: 0n });
    approveDepositSpending.mockResolvedValue("0xapprove");
    depositApproved.mockResolvedValue("0xdep");
    claimMany.mockResolvedValue("0xclaim");
    switchSide.mockResolvedValue("0xswitch");
    fetchUserPositions.mockResolvedValue({
      wallet: "0x1111111111111111111111111111111111111111",
      positions: [
        {
          templateId: tradeContext.templateId,
          epochId: 7,
          initialized: true,
          claimed: false,
          claimableNow: true,
          stakes: ["12000000000000000000", "0", "0", "0", "0", "0", "0", "0"],
          totalStake: "12000000000000000000",
          pendingClaimAmount: "18000000000000000000",
          pendingRefundAmount: "0",
        },
      ],
      dataFreshness: { lastIndexedBlock: 123 },
    });
  });

  it("keeps approve and buy as separate wallet actions (no EIP-5792 batch)", async () => {
    renderCard();

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "5" } });
    const tradeCtas = screen.getAllByRole("button", { name: /^Trade$/ });
    fireEvent.click(tradeCtas[tradeCtas.length - 1]);

    await waitFor(() => {
      expect(approveDepositSpending).toHaveBeenCalledWith(5000000000000000000n);
    });
    expect(batchApproveAndDeposit).not.toHaveBeenCalled();
    expect(depositApproved).not.toHaveBeenCalled();
    expect(await screen.findByText(/tap Submit buy/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Submit buy/ }));

    await waitFor(() => {
      expect(depositApproved).toHaveBeenCalledWith({
        templateId: tradeContext.templateId,
        epochId: 7n,
        outcomeIndex: 0,
        amount: 5000000000000000000n,
      });
    });
  });

  it("claims indexed claimable positions", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(await screen.findByText("Claimable epochs")).toBeInTheDocument();
    expect(await screen.findByText("18.00")).toBeInTheDocument();

    const claimButtons = screen.getAllByRole("button", { name: /^Claim$/ });
    fireEvent.click(claimButtons[claimButtons.length - 1]);

    await waitFor(() => {
      expect(claimMany).toHaveBeenCalledWith([
        {
          templateId: tradeContext.templateId,
          epochId: 7n,
        },
      ]);
    });
  });

  it("shows payout preview and stake multiple when amount is entered on Buy", async () => {
    renderCard();
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "10" } });
    const preview = await screen.findByTestId("stake-payout-preview");
    expect(preview.textContent).toMatch(/Return if/);
    expect(preview.textContent).toMatch(/Yes/);
    expect(preview.textContent).toMatch(/15\.14/);
    expect(screen.getByText(/×1\.51/)).toBeInTheDocument();
  });

  it("submits switchSide when Move stake is confirmed", async () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Move stake" }));
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "5" } });
    const switchBtn = screen.getByRole("button", { name: /Switch stake/i });
    await waitFor(() => {
      expect(switchBtn).not.toBeDisabled();
    });
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(switchSide).toHaveBeenCalledWith({
        templateId: tradeContext.templateId,
        epochId: 7n,
        fromOutcomeIndex: 0,
        toOutcomeIndex: 1,
        amount: 5n * W,
      });
    });
  });

});
