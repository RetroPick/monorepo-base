import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack(config) {
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
