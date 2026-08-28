import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components"

export const waitlistWelcomeSubject = "RetroPick waitlist confirmation"

type WaitlistWelcomeEmailProps = {
  email: string
}

const WAITLIST_URL = "https://retropick.xyz"
const DISCORD_URL = "https://discord.gg/5EsnWvcErv"
const TELEGRAM_URL = "https://t.me/RetroPickMarket"

export function WaitlistWelcomeEmail({ email }: WaitlistWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your RetroPick waitlist email is confirmed. Join Discord or Telegram for updates.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>RetroPick</Heading>
          <Text style={badge}>Waitlist</Text>
          <Heading style={title}>You&apos;re Confirmed</Heading>

          <Section style={communityBlock}>
            <Text style={communityTitle}>Join the community</Text>
            <Text style={communityLinks}>
              <Link href={DISCORD_URL} style={link}>
                Discord
              </Link>{" "}
              {" | "}
              <Link href={TELEGRAM_URL} style={link}>
                Telegram
              </Link>
            </Text>
          </Section>

          <Section style={emailBlock}>
            <Text style={label}>Your email</Text>
            <Text style={emailText}>{email}</Text>
          </Section>

          <Text style={text}>You&apos;re now on the RetroPick priority list.</Text>
          <Text style={text}>
            We&apos;ll send early access updates for Polymarket-native markets, source evidence, and portfolio tools.
          </Text>
          <Text style={text}>No daily promotions. No unrelated announcements.</Text>

          <Hr style={hr} />
          <Heading as="h3" style={subheading}>
            What happens next
          </Heading>
          <Text style={text}>We will email you once early access is available for your account.</Text>

          <Text style={text}>
            Website waitlist:{" "}
            <Link href={WAITLIST_URL} style={link}>
              retropick.xyz
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>RetroPick waitlist confirmation email</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f7fb",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "24px 12px",
}

const container = {
  margin: "0 auto",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  padding: "24px",
}

const heading = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 8px 0",
  textAlign: "center" as const,
}

const badge = {
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "600",
  textAlign: "center" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.7px",
  margin: "0 0 12px 0",
}

const title = {
  color: "#111827",
  fontSize: "28px",
  fontWeight: "700",
  textAlign: "center" as const,
  margin: "0 0 14px 0",
}

const subheading = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 12px 0",
  textAlign: "left" as const,
}

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px 0",
}

const emailBlock = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px 14px",
  marginBottom: "18px",
}

const communityBlock = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "12px 14px",
  marginBottom: "14px",
}

const communityTitle = {
  color: "#1e3a8a",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 6px 0",
}

const communityLinks = {
  color: "#1d4ed8",
  fontSize: "15px",
  margin: 0,
}

const label = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 6px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
}

const emailText = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "600",
  margin: 0,
}

const hr = {
  borderColor: "#e5e7eb",
  borderStyle: "solid",
  borderWidth: "1px 0 0 0",
  margin: "14px 0",
}

const link = {
  color: "#2563eb",
  textDecoration: "underline",
}

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
}
