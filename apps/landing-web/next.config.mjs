/** @type {import('next').NextConfig} */
import path from "node:path"

const workspaceRoot = path.resolve(process.cwd(), "../..")

const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
  serverExternalPackages: ["@react-email/render", "@react-email/components"],
}

export default nextConfig
