import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    server: {
      deps: {
        inline: [
          "@walletconnect/logger",
          "@reown/appkit-adapter-wagmi",
          "@reown/appkit",
          "@reown/appkit-pay",
        ],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@retropick/abi": path.resolve(__dirname, "../../packages/legacy/abi"),
      "@retropick/contracts": path.resolve(__dirname, "../../packages/legacy/contracts"),
    },
  },
});
