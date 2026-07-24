import { getDocsSiteUrl } from "@/lib/runtimeEnv";

export const legalRoutes = {
  terms: "/app/terms",
  privacy: "/app/privacy",
} as const;

/** Central place to swap docs host or legal routes without touching multiple components. */
export const siteLinks = {
  docsUrl: getDocsSiteUrl(),
  termsUrl: legalRoutes.terms,
  privacyUrl: legalRoutes.privacy,
} as const;

export const socialLinks = {
  discord: "https://discord.gg/K8vrg4w53u",
  telegram: "https://t.me/RetroPickMarket",
  x: "https://x.com/RetroPickMarket",
} as const;
