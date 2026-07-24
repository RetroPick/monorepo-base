import * as React from "react"
import { render } from "@react-email/render"
import { describe, expect, it } from "vitest"
import { WaitlistWelcomeEmail } from "@/emails/WaitlistWelcome"

describe("WaitlistWelcomeEmail render", () => {
  it("renders transactional content with required community links", async () => {
    const el = React.createElement(WaitlistWelcomeEmail, { email: "user@example.com" })
    const html = await render(el)
    const plain = await render(el, { plainText: true })

    expect(html.length).toBeGreaterThan(1200)
    expect(plain.length).toBeGreaterThan(120)
    expect(html).toContain("RetroPick")
    expect(html).toContain("user@example.com")
    expect(html).toContain("https://discord.gg/5EsnWvcErv")
    expect(html).toContain("https://t.me/RetroPickMarket")
    expect(html).not.toContain("Element type is invalid")
  })
})
