import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleRoot, "../../../../../");
const webNodeModules = path.join(repoRoot, "apps/web/node_modules");
const feNodeModules = path.join(repoRoot, "apps/fe-v1/node_modules");
const requireFromFe = createRequire(path.join(feNodeModules, "vitest/package.json"));
const requireFromWeb = createRequire(path.join(webNodeModules, "vitest/package.json"));

const react = requireFromFe("@vitejs/plugin-react-swc").default;
const { defineConfig } = requireFromFe("vitest/config");

function resolveModule(name: string): string {
  try {
    return path.dirname(requireFromWeb.resolve(`${name}/package.json`));
  } catch {
    return path.join(feNodeModules, name);
  }
}

export default defineConfig({
  root: moduleRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(repoRoot, "apps/web/src"),
      "@retropick/polymarket": path.join(repoRoot, "packages/polymarket/src/index.ts"),
      "@testing-library/jest-dom": path.join(feNodeModules, "@testing-library/jest-dom"),
      "@testing-library/react": path.join(feNodeModules, "@testing-library/react"),
      react: path.join(feNodeModules, "react"),
      "react-dom": path.join(feNodeModules, "react-dom"),
      "react-router-dom": path.join(feNodeModules, "react-router-dom"),
      "@tanstack/react-query": path.join(feNodeModules, "@tanstack/react-query"),
      clsx: path.join(feNodeModules, "clsx"),
      wagmi: resolveModule("wagmi"),
      viem: resolveModule("viem"),
      siwe: resolveModule("siwe"),
      "@reown/appkit/react": resolveModule("@reown/appkit"),
      "@reown/appkit/networks": resolveModule("@reown/appkit"),
      "@wagmi/core": resolveModule("@wagmi/core"),
      "@reown/appkit-adapter-wagmi": resolveModule("@reown/appkit-adapter-wagmi"),
    },
    modules: [webNodeModules, feNodeModules, path.join(repoRoot, "node_modules"), "node_modules"],
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
