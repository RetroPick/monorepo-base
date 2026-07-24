import nextVitals from "eslint-config-next/core-web-vitals"

const config = [
  {
    ignores: ["components/ui/sidebar.tsx"],
  },
  ...nextVitals,
]

export default config
