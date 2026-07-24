/**
 * Funding profile configuration
 *
 * Primary profile: "arbitrum" (Arbitrum One)
 * Users fund with Arbitrum USDC directly, or use the cross-chain deposit flow
 * (any chain → Arbitrum USDC via LiFi bridge abstraction).
 */
import {
  arbitrumUSDC,
  arbitrumUSDT,
  baseUSDC,
  baseETH,
  ethereumUSDC,
  ethereumUSDT,
  baseSepoliaETH,
} from '@reown/appkit-pay'

export type FundingProfileKey = 'arbitrum' | 'arbitrum-sepolia' | 'mainnet' | 'base' | 'sepolia'

type FundingAssetOption = {
  id:     string
  label:  string
  helper: string
  asset:  typeof arbitrumUSDC
}

type FundingProfile = {
  key:                    FundingProfileKey
  chainId:                number
  chainLabel:             string
  receiveLabel:           string
  directFundingLabel:     string
  cardRailLabel:          string
  directFundingDescription: string
  exchangeDescription:    string
  assets:                 FundingAssetOption[]
}

export const FUNDING_PROFILES: Record<FundingProfileKey, FundingProfile> = {
  // ── Production ──────────────────────────────────────────────────────────────
  arbitrum: {
    key:       'arbitrum',
    chainId:   42161,
    chainLabel: 'Arbitrum One',
    receiveLabel:       'Receive USDC on Arbitrum',
    directFundingLabel: 'Direct Arbitrum funding',
    cardRailLabel:      'Buy with Card / Bank',
    directFundingDescription:
      'Fund your wallet with USDC on Arbitrum One — the settlement chain for all RetroPick markets. ' +
      'Use the bridge flow to deposit from any other chain.',
    exchangeDescription:
      'Withdraw USDC from a supported exchange directly to your Arbitrum One wallet address.',
    assets: [
      { id: 'arb-usdc', label: 'Arbitrum USDC', helper: 'Native USDC on Arbitrum One', asset: arbitrumUSDC },
      { id: 'arb-usdt', label: 'Arbitrum USDT', helper: 'USDT on Arbitrum One',         asset: arbitrumUSDT },
      { id: 'base-usdc', label: 'Base USDC',    helper: 'USDC on Base (bridged via LiFi)', asset: baseUSDC },
      { id: 'eth-usdc',  label: 'Ethereum USDC', helper: 'USDC on Ethereum mainnet',    asset: ethereumUSDC },
      { id: 'eth-usdt',  label: 'Ethereum USDT', helper: 'USDT on Ethereum mainnet',    asset: ethereumUSDT },
    ],
  },

  // ── Staging testnet ─────────────────────────────────────────────────────────
  'arbitrum-sepolia': {
    key:       'arbitrum-sepolia',
    chainId:   421614,
    chainLabel: 'Arbitrum Sepolia',
    receiveLabel:       'Receive testnet USDC',
    directFundingLabel: 'Testnet funding',
    cardRailLabel:      'Testnet — no card rail',
    directFundingDescription:
      'For Arbitrum Sepolia testnet use only. Obtain test USDC from the Circle faucet or a testnet bridge.',
    exchangeDescription:
      'Exchanges do not support testnet deposits. Use the Circle USDC faucet for Sepolia test funds.',
    assets: [
      { id: 'base-sep-eth', label: 'Base Sepolia ETH', helper: 'Testnet ETH on Base Sepolia', asset: baseSepoliaETH },
    ],
  },

  // ── Alternative mainnet profiles ────────────────────────────────────────────
  mainnet: {
    key:       'mainnet',
    chainId:   1,
    chainLabel: 'Ethereum',
    receiveLabel:       'Receive Ethereum funds',
    directFundingLabel: 'Direct Ethereum funding',
    cardRailLabel:      'Buy with Card / Bank',
    directFundingDescription:
      'Fund your Ethereum wallet then bridge USDC to Arbitrum One using the cross-chain deposit flow.',
    exchangeDescription:
      'Withdraw ETH or USDC from an exchange to your Ethereum wallet, then bridge to Arbitrum.',
    assets: [
      { id: 'eth-usdc', label: 'Ethereum USDC', helper: 'USDC on Ethereum mainnet', asset: ethereumUSDC },
      { id: 'eth-usdt', label: 'Ethereum USDT', helper: 'USDT on Ethereum mainnet', asset: ethereumUSDT },
    ],
  },
  base: {
    key:       'base',
    chainId:   8453,
    chainLabel: 'Base',
    receiveLabel:       'Receive Base funds',
    directFundingLabel: 'Direct Base funding',
    cardRailLabel:      'Buy with Card / Bank',
    directFundingDescription:
      'Fund your Base wallet then use the cross-chain deposit flow to bridge USDC to Arbitrum One.',
    exchangeDescription:
      'Withdraw USDC from an exchange to your Base wallet, then bridge to Arbitrum for RetroPick.',
    assets: [
      { id: 'base-usdc', label: 'Base USDC', helper: 'USDC on Base', asset: baseUSDC },
      { id: 'base-eth',  label: 'Base ETH',  helper: 'ETH on Base',  asset: baseETH  },
    ],
  },
  sepolia: {
    key:       'sepolia',
    chainId:   11155111,
    chainLabel: 'Sepolia',
    receiveLabel:       'Receive testnet funds',
    directFundingLabel: 'Testnet funding path',
    cardRailLabel:      'Open On-Ramp Providers',
    directFundingDescription:
      'Card and exchange providers do not support Sepolia directly. Use a faucet or testnet bridge.',
    exchangeDescription:
      'Exchange deposits are unavailable for Sepolia. Use testnet faucets instead.',
    assets: [
      { id: 'base-sep-eth', label: 'Base Sepolia ETH', helper: 'Testnet ETH on Base Sepolia', asset: baseSepoliaETH },
    ],
  },
}

export function getFundingProfileKey(): FundingProfileKey {
  const value = import.meta.env.VITE_APP_FUNDING_PROFILE as FundingProfileKey | undefined
  if (value && value in FUNDING_PROFILES) return value
  return 'arbitrum'
}

export const activeFundingProfile = FUNDING_PROFILES[getFundingProfileKey()]
