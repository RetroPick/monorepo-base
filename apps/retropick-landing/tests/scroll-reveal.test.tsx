/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import ScrollReveal from "@/components/motion/ScrollReveal"

describe("ScrollReveal", () => {
  it("renders content immediately when reduced motion is preferred", () => {
    render(
      <ScrollReveal>
        <div>Motion Safe Content</div>
      </ScrollReveal>
    )

    const content = screen.getByText("Motion Safe Content")

    expect(content).toBeVisible()
    expect(content.parentElement).not.toHaveStyle({ opacity: "0" })
  })
})
