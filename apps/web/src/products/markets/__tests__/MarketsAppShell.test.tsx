import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/shared/providers/theme-provider";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";

vi.mock("../wallet/hooks/useMarketsWalletConnect", () => ({
  useMarketsWalletConnect: () => ({ isConnected: false }),
}));

vi.mock("../wallet/hooks/useMarketsWalletSession", () => ({
  useMarketsWalletSession: () => ({
    isSessionAuthenticated: false,
    authenticate: vi.fn(),
    sessionState: "idle",
  }),
}));

vi.mock("../wallet/components/ConnectWalletButton", () => ({
  ConnectWalletButton: ({ label }: { label: React.ReactNode }) => (
    <button type="button">{typeof label === "string" ? label : "Sign In"}</button>
  ),
}));

function renderShell(initialPath = "/markets?tab=explore") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialPath]}>
          <MarketsAppShell title="Explore">
            <p>Page content</p>
          </MarketsAppShell>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("MarketsAppShell", () => {
  it("renders top bar navigation and page content", () => {
    renderShell();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows mobile bottom nav on discover routes", () => {
    renderShell("/markets?tab=explore");
    const navs = screen.getAllByRole("navigation");
    expect(navs.some((n) => n.getAttribute("aria-label") === "Primary navigation")).toBe(true);
  });
});
