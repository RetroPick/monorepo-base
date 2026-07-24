import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // `true` listens on all addresses (IPv4 + IPv6). `::` alone can break some WSL2 ↔ host browser setups.
    host: true,
    port: 5173,
    hmr: {
      // Surface runtime errors instead of a silent white screen during dev.
      overlay: true,
    },
    proxy: {
      // FRED API proxy avoids browser CORS; client passes api_key via VITE_FRED_API_KEY
      '/api/fred': {
        target: 'https://api.stlouisfed.org/fred',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fred/, ''),
        timeout: 60000,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    sourcemap: mode === "development",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("katex")) {
            return "math";
          }

          if (id.includes("lightweight-charts") || id.includes("recharts")) {
            return "charts";
          }
        },
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
  define: {
    "global": "window",
  },
}));
