
import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { customFuji, networks, projectId, wagmiAdapter } from '../config'

const queryClient = new QueryClient()
const metadata = {
    name: 'RetroPick',
    description: 'Decentralized Prediction Market',
    url: 'https://retropick.app',
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
}

let isAppKitInitialized = false

if (typeof window !== 'undefined' && !isAppKitInitialized) {
    createAppKit({
        adapters: [wagmiAdapter],
        networks,
        defaultNetwork: customFuji,
        projectId,
        metadata,
        enableEmbedded: true,
        enableReconnect: false,
        allowUnsupportedChain: true,
        defaultAccountTypes: {
            eip155: 'smartAccount',
        },
        features: {
            analytics: true,
            email: false,
            socials: ['google'],
        },
    })

    isAppKitInitialized = true
}

export function Web3ModalProvider({ children, cookies }: { children: ReactNode; cookies?: string }) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig as typeof wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    )
}
