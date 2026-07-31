import { createAppKit, modal } from '@reown/appkit/react'
import { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { appDefaultNetwork, networks, projectId, wagmiAdapter } from '../config'

/** Above Radix Dialog (z-50) and in-app menus (z-[10000]) so WalletConnect stays usable */
const APPKIT_Z_INDEX = 100_150

let isAppKitInitialized = false

function getMetadataUrl() {
  if (typeof window === 'undefined') return 'https://retropick.io'
  const { origin, protocol } = window.location
  if (protocol === 'http:' || protocol === 'https:') return origin
  return 'https://retropick.io'
}

export function ensureAppKitInitialized() {
  if (typeof window === 'undefined' || isAppKitInitialized) return

  createAppKit({
    adapters:       [wagmiAdapter],
    networks,
    defaultNetwork: appDefaultNetwork,
    projectId,
    metadata: {
      name:        'RetroPick',
      description: 'Oracle-resolved prediction markets on Arbitrum',
      url:         getMetadataUrl(),
      icons:       ['https://retropick.io/icon.png'],
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
      email:     false,
      socials:   ['google'],
    },
  })

  isAppKitInitialized = true
}

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as typeof wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
      {children}
    </WagmiProvider>
  )
}

export async function openAppKitWhenReady(): Promise<void> {
  ensureAppKitInitialized()
  if (!modal) {
    throw new Error('Wallet UI is not initialized.')
  }
  await modal.ready()
  await modal.open()
}
