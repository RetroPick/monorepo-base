import { ReactNode, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { appDefaultNetwork, networks, projectId, wagmiAdapter } from '../config'

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

/**
 * Loads `@reown/appkit/react` lazily so the React UI half of AppKit
 * (and its transitive dependencies) does not sit in the initial JS graph.
 * The wagmi adapter itself is still imported at module scope because
 * `WagmiProvider` needs the wagmi config synchronously.
 */
async function initAppKit() {
  if (typeof window === 'undefined' || window.__retropickReownAppKitInit) return

  try {
    const { createAppKit } = await import('@reown/appkit/react')

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
    console.error('[RetroPick] Reown AppKit failed to initialize. UI may load without wallet modal.', err)
  }
}

async function prewarmModal() {
  if (typeof window === 'undefined') return
  try {
    const { modal } = await import('@reown/appkit/react')
    await modal?.ready()
  } catch {
    /* If AppKit can't initialize, the wallet button surfaces the error path itself. */
  }
}

export function Web3ModalProvider({ children, cookies }: { children: ReactNode; cookies?: string }) {
  void cookies
  useEffect(() => {
    void initAppKit()
  }, [])

  /** Pre-warm AppKit before auth actions; Google sign-in needs a synchronous popup. */
  useEffect(() => {
    void prewarmModal()
  }, [])

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as typeof wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
      {children}
    </WagmiProvider>
  )
}
