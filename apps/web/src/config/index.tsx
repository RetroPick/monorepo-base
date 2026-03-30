import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, sepolia, type AppKitNetwork } from '@reown/appkit/networks'

export const projectId = 'f39121ec755731ed58c1605658872bce'

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
    chainNamespace: 'eip155',
    testnet: true,
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [customFuji, mainnet, arbitrum, sepolia]

export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({
        storage: cookieStorage,
    }),
    ssr: false,
    projectId,
    networks,
    transports: {
        [customFuji.id]: http(customFuji.rpcUrls.default.http[0]),
    },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
