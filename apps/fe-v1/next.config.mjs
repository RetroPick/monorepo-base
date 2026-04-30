import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.VERCEL) {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  if (!raw) {
    throw new Error(
      "Vercel build: set NEXT_PUBLIC_API_URL to your deployed Go API origin (https://…). " +
        "This project root only ships fe-v1; apps/backend is not run on Vercel.",
    );
  }
  const lower = raw.toLowerCase();
  if (lower.includes("127.0.0.1") || lower.includes("localhost")) {
    throw new Error(
      "Vercel build: NEXT_PUBLIC_API_URL must not point at localhost — browsers load the app from the public internet. " +
        "Deploy apps/backend (see repo README) and set this to that API's HTTPS URL.",
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/i,
      resourceQuery: /raw/,
      type: "asset/source",
    });
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
      "@retropick/abi": path.resolve(__dirname, "../../package/abi"),
      "@retropick/contracts": path.resolve(__dirname, "../../packages/contracts"),
    };
    return config;
  },
};

export default nextConfig;
