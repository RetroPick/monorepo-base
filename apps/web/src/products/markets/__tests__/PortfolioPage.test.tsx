import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/shared/providers/theme-provider";

import { PortfolioPage } from "../pages/PortfolioPage";

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
  it("renders guest portfolio dashboard shell", () => {
    renderPortfolio();
    expect(screen.getByText("Exposure and claims")).toBeInTheDocument();
    expect(screen.getByText("Category Distribution")).toBeInTheDocument();
    expect(screen.getByText("No data yet.")).toBeInTheDocument();
    expect(screen.getByText(/Guest preview/i)).toBeInTheDocument();
  });
});
