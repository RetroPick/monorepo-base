import { z } from "zod"

export const WAITLIST_ROLE_OPTIONS = [
  "trader",
  "builder",
  "founder",
  "researcher",
  "market_maker",
  "defi_user",
  "crypto_native",
  "macro_trader",
  "investor",
  "other",
] as const

export const WAITLIST_PRIMARY_USE_CASE_OPTIONS = [
  "crypto_event_trading",
  "macro_event_trading",
  "hedging",
  "prediction_markets",
  "research",
  "market_making",
  "alerts",
  "api_data",
  "other",
] as const

export const WAITLIST_STATUS_OPTIONS = ["pending", "approved", "invited", "rejected", "subscribed"] as const

export const WAITLIST_SOURCE_OPTIONS = [
  "website",
  "crypto_twitter",
  "telegram",
  "discord",
  "friend",
  "referral",
  "search",
  "podcast",
  "newsletter",
  "manual_test",
  "other",
] as const

const MAX_LENGTHS = {
  email: 320,
  name: 120,
  telegram: 80,
  x_handle: 80,
  wallet_address: 80,
  role: 40,
  user_type: 80,
  interest: 160,
  primary_use_case: 80,
  source: 80,
  referral_code: 64,
  referred_by: 64,
  utm: 120,
  landingPath: 240,
  userAgent: 512,
  ipHash: 128,
  notes: 1000,
  honeypot: 200,
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HANDLE_REGEX = /^@?[A-Za-z0-9_]{1,15}$/
const TELEGRAM_REGEX = /^@?[A-Za-z0-9_]{3,32}$/
const REFERRAL_REGEX = /^[A-Za-z0-9_-]{3,64}$/
const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null
  const normalized = value.trim().replace(/\s+/g, " ")
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return normalized.slice(0, MAX_LENGTHS.email)
}

function normalizeHandle(value: unknown, maxLength: number) {
  const normalized = normalizeString(value, maxLength)
  if (!normalized) return null
  return normalized.startsWith("@") ? normalized : `@${normalized}`
}

function normalizeWalletAddress(value: unknown) {
  const normalized = normalizeString(value, MAX_LENGTHS.wallet_address)
  if (!normalized) return null
  return normalized.toLowerCase()
}

function inferSource(input: {
  source: string | null
  utmSource: string | null
  referredBy: string | null
}) {
  if (input.source) return input.source
  if (input.utmSource) return input.utmSource
  if (input.referredBy) return "referral"
  return "website"
}

function hasSpamPayload(values: Array<string | null>) {
  return values.some((value) => {
    if (!value) return false
    const lower = value.toLowerCase()
    return (
      lower.includes("<script") ||
      lower.includes("javascript:") ||
      lower.includes("<iframe") ||
      lower.includes("href=") ||
      /https?:\/\//.test(lower)
    )
  })
}

const waitlistPayloadSchema = z.object({
  email: z.string().min(1, "Email is required"),
  name: z.any().optional(),
  telegram: z.any().optional(),
  x_handle: z.any().optional(),
  wallet_address: z.any().optional(),
  role: z.any().optional(),
  user_type: z.any().optional(),
  interest: z.any().optional(),
  primary_use_case: z.any().optional(),
  source: z.any().optional(),
  referred_by: z.any().optional(),
  utm_source: z.any().optional(),
  utm_medium: z.any().optional(),
  utm_campaign: z.any().optional(),
  utm_content: z.any().optional(),
  utm_term: z.any().optional(),
  landing_path: z.any().optional(),
  notes: z.any().optional(),
  company_website: z.any().optional(),
})

export type WaitlistInsertRecord = {
  email: string
  name: string | null
  telegram: string | null
  x_handle: string | null
  wallet_address: string | null
  role: string | null
  user_type: string | null
  interest: string | null
  primary_use_case: string | null
  source: string
  referred_by: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  landing_path: string | null
  user_agent: string | null
  ip_hash: string | null
  notes: string | null
  referral_code?: string | null
}

export type WaitlistParseResult =
  | { ok: true; data: WaitlistInsertRecord; honeypotTriggered: boolean }
  | { ok: false; error: string }

export function parseWaitlistPayload(input: unknown, metadata?: { userAgent?: string | null; ipHash?: string | null }): WaitlistParseResult {
  const parsed = waitlistPayloadSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Invalid request payload" }
  }

  const email = normalizeEmail(parsed.data.email)
  if (!email || !EMAIL_REGEX.test(email)) {
    return { ok: false, error: "Enter a valid email address." }
  }

  const companyWebsite = normalizeString(parsed.data.company_website, MAX_LENGTHS.honeypot)
  const name = normalizeString(parsed.data.name, MAX_LENGTHS.name)
  const telegram = normalizeHandle(parsed.data.telegram, MAX_LENGTHS.telegram)
  const xHandle = normalizeHandle(parsed.data.x_handle, MAX_LENGTHS.x_handle)
  const walletAddress = normalizeWalletAddress(parsed.data.wallet_address)
  const role = normalizeString(parsed.data.role, MAX_LENGTHS.role)
  const userType = normalizeString(parsed.data.user_type, MAX_LENGTHS.user_type)
  const interest = normalizeString(parsed.data.interest, MAX_LENGTHS.interest)
  const primaryUseCase = normalizeString(parsed.data.primary_use_case, MAX_LENGTHS.primary_use_case)
  const source = normalizeString(parsed.data.source, MAX_LENGTHS.source)
  const referredBy = normalizeString(parsed.data.referred_by, MAX_LENGTHS.referred_by)
  const utmSource = normalizeString(parsed.data.utm_source, MAX_LENGTHS.utm)
  const utmMedium = normalizeString(parsed.data.utm_medium, MAX_LENGTHS.utm)
  const utmCampaign = normalizeString(parsed.data.utm_campaign, MAX_LENGTHS.utm)
  const utmContent = normalizeString(parsed.data.utm_content, MAX_LENGTHS.utm)
  const utmTerm = normalizeString(parsed.data.utm_term, MAX_LENGTHS.utm)
  const landingPath = normalizeString(parsed.data.landing_path, MAX_LENGTHS.landingPath)
  const notes = normalizeString(parsed.data.notes, MAX_LENGTHS.notes)
  const userAgent = normalizeString(metadata?.userAgent, MAX_LENGTHS.userAgent)
  const ipHash = normalizeString(metadata?.ipHash, MAX_LENGTHS.ipHash)

  if (role && !WAITLIST_ROLE_OPTIONS.includes(role as (typeof WAITLIST_ROLE_OPTIONS)[number])) {
    return { ok: false, error: "Choose a valid role." }
  }

  if (
    primaryUseCase &&
    !WAITLIST_PRIMARY_USE_CASE_OPTIONS.includes(primaryUseCase as (typeof WAITLIST_PRIMARY_USE_CASE_OPTIONS)[number])
  ) {
    return { ok: false, error: "Choose a valid use case." }
  }

  if (source && source.length > MAX_LENGTHS.source) {
    return { ok: false, error: "Source is too long." }
  }

  if (xHandle && !HANDLE_REGEX.test(xHandle)) {
    return { ok: false, error: "Enter a valid X handle." }
  }

  if (telegram && !TELEGRAM_REGEX.test(telegram)) {
    return { ok: false, error: "Enter a valid Telegram handle." }
  }

  if (walletAddress && !WALLET_REGEX.test(walletAddress)) {
    return { ok: false, error: "Enter a valid EVM wallet address." }
  }

  if (referredBy && !REFERRAL_REGEX.test(referredBy)) {
    return { ok: false, error: "Referral code is invalid." }
  }

  if (
    hasSpamPayload([name, telegram, xHandle, userType, interest, notes, source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm])
  ) {
    return { ok: false, error: "Submission was flagged as spam." }
  }

  return {
    ok: true,
    honeypotTriggered: Boolean(companyWebsite),
    data: {
      email,
      name,
      telegram,
      x_handle: xHandle,
      wallet_address: walletAddress,
      role,
      user_type: userType,
      interest,
      primary_use_case: primaryUseCase,
      source: inferSource({ source, utmSource, referredBy }),
      referred_by: referredBy,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      landing_path: landingPath,
      user_agent: userAgent,
      ip_hash: ipHash,
      notes,
    },
  }
}
