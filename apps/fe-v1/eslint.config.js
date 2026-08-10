import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "tsconfig.tsbuildinfo",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      "@typescript-eslint/no-unused-vars": "off",

      // May-2026 frontend migration baseline.
      // Keep legacy debt visible without blocking restoration/push.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",

      // Historical implementation calls Wagmi useAccount inside try/catch
      // to support presentation-only trees without WagmiProvider.
      // Preserve May-2026 behavior for now; migrate separately.
      "react-hooks/rules-of-hooks": "warn",
    },
  },
);
