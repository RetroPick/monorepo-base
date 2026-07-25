import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  transpilePackages: ["@retropick/contracts"],
  experimental: {
    /**
     * Tree-shake lucide/recharts/radix entrypoints (same idea as fe-v1).
     * https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
     */
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-slot",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
