
import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, sepolia, type AppKitNetwork } from '@reown/appkit/networks'

// Get projectId from https://cloud.reown.com
export const projectId = 'f39121ec755731ed58c1605658872bce' // Public testing ID, user should replace

if (!projectId) {
    throw new Error('Project ID is not defined')
}

// Custom configuration for explicit wallet behavior
export const customFuji: AppKitNetwork = {
    id: 43113,
    name: 'Avalanche Fuji Testnet',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
    },
    blockExplorers: {
        default: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' },
    },
    caipNetworkId: 'eip155:43113',
    chainNamespace: 'eip155'
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [customFuji, mainnet, arbitrum, sepolia]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({
        storage: cookieStorage
    }),
    ssr: true,
    projectId,
    networks
})

export const config = wagmiAdapter.wagmiConfig
