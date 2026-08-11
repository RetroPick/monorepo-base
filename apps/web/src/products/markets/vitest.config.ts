import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

const moduleRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleRoot, "../../../../../");
const webNodeModules = path.join(repoRoot, "apps/web/node_modules");
const requireFromWeb = createRequire(path.join(webNodeModules, "vitest/package.json"));

function resolveModule(name: string): string {
  return path.dirname(requireFromWeb.resolve(`${name}/package.json`));
}

function resolveSubpath(subpath: string): string {
  return requireFromWeb.resolve(subpath);
}

export default defineConfig({
  root: moduleRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(repoRoot, "apps/web/src"),
      "@retropick/polymarket": path.join(repoRoot, "packages/polymarket/src/index.ts"),
      "@testing-library/jest-dom": resolveModule("@testing-library/jest-dom"),
      "@testing-library/react": resolveModule("@testing-library/react"),
      react: resolveModule("react"),
      "react-dom": resolveModule("react-dom"),
      "react-router-dom": resolveModule("react-router-dom"),
      "@tanstack/react-query": resolveModule("@tanstack/react-query"),
      clsx: resolveSubpath("clsx"),
      "tailwind-merge": resolveSubpath("tailwind-merge"),
      wagmi: resolveModule("wagmi"),
      viem: resolveModule("viem"),
      siwe: resolveModule("siwe"),
      "@reown/appkit/react": resolveSubpath("@reown/appkit/react"),
      "@reown/appkit/networks": resolveSubpath("@reown/appkit/networks"),
      "@wagmi/core": resolveModule("@wagmi/core"),
      "@reown/appkit-adapter-wagmi": resolveModule("@reown/appkit-adapter-wagmi"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: [
      "__tests__/**/*.{test,spec}.{ts,tsx}",
      "wallet/__tests__/**/*.{test,spec}.{ts,tsx}",
      "funding/__tests__/**/*.{test,spec}.{ts,tsx}",
      "trading/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
  },
});
