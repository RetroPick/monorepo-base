import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { BottomNav } from "../components/shell/BottomNav";

describe("BottomNav", () => {
  it("preserves query strings on discover tab links", () => {
    render(
      <MemoryRouter initialEntries={["/markets?tab=explore"]}>
        <BottomNav active="explore" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /explore/i })).toHaveAttribute("href", "/markets?tab=explore");
    expect(screen.getByRole("link", { name: /markets/i })).toHaveAttribute("href", "/markets?tab=markets");
  });
});
