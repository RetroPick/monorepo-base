import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, ''),
        timeout: 60000,
      },
      // FRED API — avoids browser CORS; client passes api_key via VITE_FRED_API_KEY
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
    },
  },
  define: {
    "global": "window",
  },
}));
