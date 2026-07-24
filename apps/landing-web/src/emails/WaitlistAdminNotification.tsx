import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components"
import type { WaitlistInsertRecord } from "@/lib/waitlist"

type WaitlistNotificationSignup = WaitlistInsertRecord & {
  created_at?: string | null
  referral_code?: string | null
}

type WaitlistAdminNotificationProps = {
  signup: WaitlistNotificationSignup
}

const labels: Array<[keyof WaitlistNotificationSignup, string]> = [
  ["email", "Email"],
  ["name", "Name"],
  ["x_handle", "X Handle"],
  ["telegram", "Telegram"],
  ["wallet_address", "Wallet"],
  ["role", "Role"],
  ["primary_use_case", "Primary Use Case"],
  ["source", "Source"],
  ["referral_code", "Referral Code"],
  ["referred_by", "Referred By"],
  ["utm_source", "UTM Source"],
  ["utm_medium", "UTM Medium"],
  ["utm_campaign", "UTM Campaign"],
  ["utm_content", "UTM Content"],
  ["utm_term", "UTM Term"],
  ["created_at", "Created At"],
  ["landing_path", "Landing Path"],
  ["user_agent", "User Agent"],
  ["ip_hash", "IP Hash"],
]

export function WaitlistAdminNotificationEmail({ signup }: WaitlistAdminNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>New RetroPick waitlist signup: {signup.email}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New RetroPick Waitlist Signup</Heading>
          <Text style={lede}>A new qualified lead joined the waitlist.</Text>

          <Section style={section}>
            {labels.map(([key, label]) => {
              const value = signup[key]
              if (!value) return null

              return (
                <Section key={key} style={row}>
                  <Text style={labelStyle}>{label}</Text>
                  <Text style={valueStyle}>{String(value)}</Text>
                </Section>
              )
            })}
          </Section>

          {signup.notes ? (
            <>
              <Hr style={hr} />
              <Text style={labelStyle}>Notes</Text>
              <Text style={valueStyle}>{signup.notes}</Text>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f5f7fb",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "24px 12px",
}

const container = {
  margin: "0 auto",
  maxWidth: "640px",
  backgroundColor: "#ffffff",
  borderRadius: "14px",
  border: "1px solid #dbe3f0",
  padding: "24px",
}

const heading = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 12px 0",
}

const lede = {
  color: "#475569",
  fontSize: "15px",
  margin: "0 0 18px 0",
}

const section = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  padding: "8px 16px",
}

const row = {
  margin: "12px 0",
}

const labelStyle = {
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.4px",
  margin: "0 0 4px 0",
  textTransform: "uppercase" as const,
}

const valueStyle = {
  color: "#0f172a",
  fontSize: "14px",
  lineHeight: "22px",
  margin: 0,
}

const hr = {
  borderColor: "#e2e8f0",
  borderStyle: "solid",
  borderWidth: "1px 0 0 0",
  margin: "18px 0",
}
