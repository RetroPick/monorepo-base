/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WLD_APP_ID: string
    readonly VITE_WLD_ACTION: string
    readonly VITE_COINGECKO_DEMO_API_KEY?: string
    /** Free key from https://fred.stlouisfed.org/docs/api/api_key.html — used for commodity/macro/benchmark reference charts */
    readonly VITE_FRED_API_KEY?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
