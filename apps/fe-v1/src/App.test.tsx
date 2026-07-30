import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("@/app/AppProviders", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    default: () => <actual.Outlet />,
  };
});

vi.mock("@/views/MarketsAll", () => ({
  default: () => <div>Markets Dashboard</div>,
}));

vi.mock("@/views/NotFound", () => ({
  default: () => <div>Not Found</div>,
}));

describe("App routing", () => {
  it("redirects the root path to the markets dashboard", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(await screen.findByText("Markets Dashboard")).toBeInTheDocument();
  });
});
