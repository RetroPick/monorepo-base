/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import Navbar from "@/sections/Navbar"

describe("Navbar", () => {
  it("opens community links from the Join Community dropdown", () => {
    render(<Navbar />)

    fireEvent.click(screen.getByRole("button", { name: /join community/i }))

    expect(screen.getByRole("menuitem", { name: /discord/i })).toHaveAttribute(
      "href",
      "https://discord.gg/5EsnWvcErv"
    )
    expect(screen.getByRole("menuitem", { name: /telegram/i })).toHaveAttribute(
      "href",
      "https://t.me/RetroPickMarket"
    )
  })

  it("switches to the scrolled state after the hero exit threshold", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 1000,
    })
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    })

    render(<Navbar />)

    const nav = screen.getByRole("navigation")
    expect(nav).toHaveAttribute("data-scrolled", "false")

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 860,
    })

    fireEvent.scroll(window)

    await waitFor(() => {
      expect(nav).toHaveAttribute("data-scrolled", "true")
    })
  })

  it("targets the source-based landing sections", () => {
    render(<Navbar />)

    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Rewards" })).toBeInTheDocument()
  })
})
