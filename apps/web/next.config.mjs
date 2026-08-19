import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@retropick/polymarket"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    // ox (transitive dep of viem/wagmi) dynamically `import(id)`s Node
    // worker_threads for salt mining — a benign pattern webpack can't
    // statically analyze. Scoped suppression keeps dev output clean without
    // masking unrelated warnings.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /virtualMasterPool\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];
    return config;
  },
};

export default nextConfig;
