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
      "Vercel build: NEXT_PUBLIC_API_URL must not point at localhost; browsers load the app from the public internet. " +
        "Deploy apps/backend (see repo README) and set this to that API's HTTPS URL.",
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    /**
     * Strips barrel imports for the listed packages so the bundler only ships
     * the icons/components actually used. See:
     * https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
     */
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "cmdk",
      "vaul",
      "recharts",
      "framer-motion",
      "wagmi",
      "viem",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "cryptologos.cc" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
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
