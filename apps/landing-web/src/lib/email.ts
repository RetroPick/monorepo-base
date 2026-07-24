import { randomBytes } from "node:crypto"
import * as React from "react"
import { render } from "@react-email/render"
import nodemailer from "nodemailer"
import { WaitlistAdminNotificationEmail } from "@/emails/WaitlistAdminNotification"
import { WaitlistWelcomeEmail, waitlistWelcomeSubject } from "@/emails/WaitlistWelcome"
import type { WaitlistInsertRecord } from "@/lib/waitlist"

type WaitlistNotificationSignup = WaitlistInsertRecord & {
  created_at?: string | null
  referral_code?: string | null
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromEmail: string
  notifyEmail: string
  replyToEmail?: string
  sendConfirmation: boolean
}

function parseSmtpBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback
  return value === "true"
}

function getEmailConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "", 10)
  const secure = parseSmtpBoolean(process.env.SMTP_SECURE?.trim(), true)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const fromEmail = process.env.WAITLIST_FROM_EMAIL?.trim()
  const notifyEmail = (process.env.WAITLIST_NOTIFY_EMAIL || "rudeus33@retropick.xyz").trim()
  const replyToEmail = process.env.WAITLIST_REPLY_TO_EMAIL?.trim()
  const sendConfirmation = parseSmtpBoolean(process.env.WAITLIST_SEND_CONFIRMATION?.trim(), false)

  if (!host || !Number.isFinite(port) || !user || !pass || !fromEmail) {
    return null
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    notifyEmail,
    replyToEmail,
    sendConfirmation,
  }
}

async function renderEmail(reactNode: Parameters<typeof render>[0]) {
  const html = await render(reactNode)
  const text = await render(reactNode, { plainText: true })
  return { html, text }
}

function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

export function generateReferralCode() {
  return randomBytes(5).toString("hex")
}

export async function sendWaitlistEmails(signup: WaitlistNotificationSignup) {
  const config = getEmailConfig()
  if (!config) {
    return { configured: false as const, adminSent: false, confirmationSent: false }
  }

  const transport = createTransport(config)
  let adminSent = false
  let confirmationSent = false

  try {
    const adminEmail = await renderEmail(
      React.createElement(WaitlistAdminNotificationEmail, { signup }) as unknown as Parameters<typeof render>[0]
    )
    await transport.sendMail({
      from: config.fromEmail,
      to: config.notifyEmail,
      subject: `New RetroPick waitlist signup: ${signup.email}`,
      html: adminEmail.html,
      text: adminEmail.text,
      ...(config.replyToEmail ? { replyTo: config.replyToEmail } : {}),
    })
    adminSent = true
  } catch (error) {
    console.error("[waitlist] Failed to send SMTP admin notification", error)
  }

  if (config.sendConfirmation) {
    try {
      const confirmationEmail = await renderEmail(
        React.createElement(WaitlistWelcomeEmail, { email: signup.email }) as unknown as Parameters<typeof render>[0]
      )
      await transport.sendMail({
        from: config.fromEmail,
        to: signup.email,
        subject: waitlistWelcomeSubject,
        html: confirmationEmail.html,
        text: confirmationEmail.text,
        ...(config.replyToEmail ? { replyTo: config.replyToEmail } : {}),
      })
      confirmationSent = true
    } catch (error) {
      console.error("[waitlist] Failed to send SMTP confirmation email", error)
    }
  }

  return { configured: true as const, adminSent, confirmationSent }
}
