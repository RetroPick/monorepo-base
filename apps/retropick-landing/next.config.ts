import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const configDirectory = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(configDirectory, "../..")

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
  serverExternalPackages: ["@react-email/render", "@react-email/components"],
}

export default nextConfig
