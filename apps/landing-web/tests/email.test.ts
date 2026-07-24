import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sendMailMock = vi.fn()
const createTransportMock = vi.fn(() => ({
  sendMail: sendMailMock,
}))

vi.mock("nodemailer", () => ({
  default: {
    createTransport: (...args: unknown[]) => createTransportMock(...args),
  },
}))

describe("sendWaitlistEmails", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.SMTP_HOST = "mail.privateemail.com"
    process.env.SMTP_PORT = "465"
    process.env.SMTP_SECURE = "true"
    process.env.SMTP_USER = "rudeus33@retropick.xyz"
    process.env.SMTP_PASS = "mailbox-password"
    process.env.WAITLIST_FROM_EMAIL = "RetroPick <rudeus33@retropick.xyz>"
    process.env.WAITLIST_NOTIFY_EMAIL = "rudeus33@retropick.xyz"
    process.env.WAITLIST_REPLY_TO_EMAIL = "rudeus33@retropick.xyz"
    process.env.WAITLIST_SEND_CONFIRMATION = "false"
    sendMailMock.mockResolvedValue({ messageId: "smtp-1" })
  })

  afterEach(() => {
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_SECURE
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    delete process.env.WAITLIST_FROM_EMAIL
    delete process.env.WAITLIST_NOTIFY_EMAIL
    delete process.env.WAITLIST_REPLY_TO_EMAIL
    delete process.env.WAITLIST_SEND_CONFIRMATION
  })

  it("returns unconfigured when SMTP env is absent", async () => {
    delete process.env.SMTP_PASS
    const { sendWaitlistEmails } = await import("@/lib/email")

    const result = await sendWaitlistEmails({
      email: "person@example.com",
      name: null,
      telegram: null,
      x_handle: null,
      wallet_address: null,
      role: null,
      user_type: null,
      interest: null,
      primary_use_case: null,
      source: "website",
      referred_by: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      landing_path: "/",
      user_agent: null,
      ip_hash: null,
      notes: null,
      referral_code: null,
      created_at: "2026-06-11T00:00:00.000Z",
    })

    expect(result).toEqual({
      configured: false,
      adminSent: false,
      confirmationSent: false,
    })
    expect(createTransportMock).not.toHaveBeenCalled()
  })

  it("sends internal notification through SMTP", async () => {
    const { sendWaitlistEmails } = await import("@/lib/email")

    const result = await sendWaitlistEmails({
      email: "person@example.com",
      name: "RetroPick Test",
      telegram: "@retropick",
      x_handle: "@retropickx",
      wallet_address: null,
      role: "builder",
      user_type: null,
      interest: null,
      primary_use_case: "prediction_markets",
      source: "manual_test",
      referred_by: "alpha123",
      utm_source: "launch-thread",
      utm_medium: "social",
      utm_campaign: "genesis",
      utm_content: null,
      utm_term: null,
      landing_path: "/?ref=alpha123",
      user_agent: "Vitest Browser",
      ip_hash: "abc123",
      notes: null,
      referral_code: "refabc123",
      created_at: "2026-06-11T00:00:00.000Z",
    })

    expect(result).toEqual({
      configured: true,
      adminSent: true,
      confirmationSent: false,
    })
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "mail.privateemail.com",
        port: 465,
        secure: true,
        auth: {
          user: "rudeus33@retropick.xyz",
          pass: "mailbox-password",
        },
      })
    )
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "RetroPick <rudeus33@retropick.xyz>",
        to: "rudeus33@retropick.xyz",
        subject: "New RetroPick waitlist signup: person@example.com",
      })
    )
  })
})
