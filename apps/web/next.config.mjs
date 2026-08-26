import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@retropick/polymarket"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    outputFileTracingRoot: path.join(__dirname, "../.."),
    outputFileTracingIncludes: {
      "/api/markets/legal/*": ["../../docs/markets-v1/legal/*.md"],
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
