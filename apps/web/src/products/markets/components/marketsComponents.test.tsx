import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { FreshnessBadge } from "../components/FreshnessBadge";
import { DataStateBanner } from "../components/DataState";
import { MarketsApiError } from "@retropick/polymarket";

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("FreshnessBadge", () => {
  it("renders fresh state", () => {
    render(
      <FreshnessBadge
        freshness={{ state: "fresh", observedAt: "2026-01-01T00:00:00Z", ageMillis: 1000 }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Fresh");
  });
});

describe("DataStateBanner", () => {
  it("shows request id from MarketsApiError", () => {
    render(
      <DataStateBanner
        error={new MarketsApiError("upstream down", { status: 502, code: "upstream", requestId: "req-99" })}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("req-99");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("MarketsShell navigation", () => {
  it("renders discover link", async () => {
    const { MarketsShell } = await import("../components/MarketsShell");
    renderWithProviders(
      <MemoryRouter initialEntries={["/markets"]}>
        <MarketsShell>
          <div>content</div>
        </MarketsShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "Markets navigation" })).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });
});
