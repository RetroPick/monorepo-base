import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";

import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeProbe() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("applies the stored dark theme to the document root", () => {
    localStorage.setItem("vite-ui-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
  });

  it("switches the document root class when toggled", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("light");

    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(document.documentElement).toHaveClass("dark");

    fireEvent.click(screen.getByRole("button", { name: "light" }));
    expect(document.documentElement).toHaveClass("light");
  });
});
