import { createAppKit, modal } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { appDefaultNetwork, networks, projectId, wagmiAdapter } from '../config'
import { isTransientApiError } from '@/lib/api/retropickApi'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failureCount, error) => failureCount < 2 && isTransientApiError(error),
    },
  },
})

/** Above Radix Dialog (z-50) and in-app menus (z-[10000]) so WalletConnect stays usable */
const APPKIT_Z_INDEX = 100_150

declare global {
  interface Window {
    __retropickReownAppKitInit?: boolean
  }
}

function getMetadataUrl() {
  if (typeof window === 'undefined') return 'https://retropick.io'
  const { origin, protocol } = window.location
  if (protocol === 'http:' || protocol === 'https:') return origin
  return 'https://retropick.io'
}

function initAppKit() {
  if (typeof window === 'undefined' || window.__retropickReownAppKitInit) return

  try {
    createAppKit({
      adapters:       [wagmiAdapter],
      networks,
      defaultNetwork: appDefaultNetwork,
      projectId,
      metadata: {
        name:        'RetroPick',
        description: 'Oracle-resolved prediction markets (Base Sepolia testnet)',
        url:         getMetadataUrl(),
        icons:       [`${getMetadataUrl()}/retropick-logo.png`],
      },
      enableEmbedded:  false,
      enableReconnect: false,
      allowUnsupportedChain: true,
      coinbasePreference: 'all',
      defaultAccountTypes: { eip155: 'eoa' },
      themeVariables: {
        '--w3m-z-index':  APPKIT_Z_INDEX,
        '--apkt-z-index': APPKIT_Z_INDEX,
      },
      features: {
        analytics: true,
        email: false,
        socials: ['google'],
        connectMethodsOrder: ['social', 'email', 'wallet'],
        emailShowWallets: false,
      },
    })

    window.__retropickReownAppKitInit = true
  } catch (err) {
    console.error('[RetroPick] Reown AppKit failed to initialize — UI may load without wallet modal.', err)
  }
}

export function Web3ModalProvider({ children, cookies }: { children: ReactNode; cookies?: string }) {
  useEffect(() => {
    initAppKit()
  }, [])

  /** Pre-warm AppKit before auth actions — Google sign-in needs a synchronous popup. */
  useEffect(() => {
    void modal?.ready().catch(() => undefined)
  }, [])

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as typeof wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
