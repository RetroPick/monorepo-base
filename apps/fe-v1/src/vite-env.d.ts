/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ── Reown / Wallet ──────────────────────────────────────────────────────────
  readonly VITE_REOWN_PROJECT_ID: string

  // ── Chain & network ─────────────────────────────────────────────────────────
  /** Primary network key. Prefer "base-sepolia" for registry / MarketEngine. */
  readonly VITE_APP_DEFAULT_NETWORK?:
    | 'base-sepolia'
    | 'arbitrum'
    | 'arbitrum-sepolia'
    | 'mainnet'
    | 'base'
    | 'optimism'
    | 'sepolia'

  /** Funding profile key (matches VITE_APP_DEFAULT_NETWORK for production). */
  readonly VITE_APP_FUNDING_PROFILE?: 'arbitrum' | 'arbitrum-sepolia' | 'mainnet' | 'base' | 'sepolia'

  // ── Smart contract addresses ─────────────────────────────────────────────────
  /** MarketEngine proxy override on Arbitrum One (optional; Base Sepolia uses registry). */
  readonly VITE_MARKET_ENGINE_ADDRESS?: `0x${string}`

  /** MarketEngine proxy override on Arbitrum Sepolia (optional). */
  readonly VITE_MARKET_ENGINE_ADDRESS_TESTNET?: `0x${string}`

  readonly VITE_EXECUTION_LEDGER_ADDRESS?: `0x${string}`
  readonly VITE_MARKET_REGISTRY_ADDRESS?: `0x${string}`
  readonly VITE_LEGACY_FAUCET_ADDRESS?: `0x${string}`

  /** RetroPickRouter (Tier C executor) address on Arbitrum One. */
  readonly VITE_ROUTER_ADDRESS?: `0x${string}`

  // ── RPC endpoints ────────────────────────────────────────────────────────────
  /** Arbitrum One RPC URL (Alchemy / Infura / QuickNode recommended). */
  readonly VITE_RPC_ARBITRUM?: string

  /** Arbitrum Sepolia RPC URL. */
  readonly VITE_RPC_ARBITRUM_SEPOLIA?: string

  // ── AML / Compliance ─────────────────────────────────────────────────────────
  /**
   * TRM Labs API key for wallet screening.
   * Per AML policy §6: screens OFAC SDN, UN Consolidated, UAE TFS, TRM proprietary DB.
   * Wallets scoring ≥ 80/100 are blocked from depositing.
   */
  readonly VITE_TRM_LABS_API_KEY?: string

  /**
   * IP geolocation API key (ipapi.co or similar).
   * Used for geofencing per AML policy §5.
   */
  readonly VITE_IP_GEOLOCATION_API_KEY?: string

  // ── Bridge / Swap abstraction ────────────────────────────────────────────────
  /**
   * LiFi API key for cross-chain bridge + swap routes.
   * Users can deposit from any chain; LiFi routes to Arbitrum USDC.
   */
  readonly VITE_LIFI_API_KEY?: string

  // ── External data APIs ───────────────────────────────────────────────────────
  readonly VITE_COINGECKO_DEMO_API_KEY?: string

  /** FRED API key for macro/commodity/benchmark reference charts. */
  readonly VITE_FRED_API_KEY?: string

  // ── App features ─────────────────────────────────────────────────────────────
  /** WorldID app ID for optional identity verification. */
  readonly VITE_WLD_APP_ID?: string

  /** WorldID action name. */
  readonly VITE_WLD_ACTION?: string

  /** RetroPick Go API (markets, health, indexer WS). Default http://127.0.0.1:8080 */
  readonly VITE_API_URL?: string

  /** Enable AML geofencing checks (set to "false" for local dev). */
  readonly VITE_ENABLE_GEOFENCING?: string

  /** Enable TRM Labs wallet screening (set to "false" for local dev). */
  readonly VITE_ENABLE_WALLET_SCREENING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}
