/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // React Email renders on the server; keep it external for predictable Node resolution.
  serverExternalPackages: ["@react-email/render", "@react-email/components"],
}

export default nextConfig
