import { useConnect } from 'wagmi'
import type { Connector } from 'wagmi'

import { customFuji } from '@/config'

function normalizeConnectorName(connector: Connector) {
    return `${connector.id} ${connector.name}`.toLowerCase()
}

function getConnectorPriority(connector: Connector) {
    const normalized = normalizeConnectorName(connector)

    if (normalized.includes('metamask')) return 0
    if (normalized.includes('phantom')) return 1
    if (normalized.includes('rabby')) return 2
    if (normalized.includes('okx')) return 3
    if (normalized.includes('core')) return 4
    if (normalized.includes('coinbase')) return 5
    if (connector.id === 'injected') return 100

    return 50
}

function getConnectorLabel(connector: Connector) {
    const normalized = normalizeConnectorName(connector)

    if (normalized.includes('metamask')) return 'MetaMask'
    if (normalized.includes('phantom')) return 'Phantom'
    if (normalized.includes('rabby')) return 'Rabby'
    if (normalized.includes('okx')) return 'OKX Wallet'
    if (normalized.includes('core')) return 'Core'
    if (normalized.includes('coinbase')) return 'Coinbase Wallet'
    if (connector.id === 'injected') return 'Browser Wallet'

    return connector.name
}

export function useWalletConnection() {
    const { connectAsync, connectors, error, isPending, pendingConnector } = useConnect()
    const walletOptions = connectors
        .map((connector) => ({
            connector,
            label: getConnectorLabel(connector),
        }))
        .sort((left, right) => getConnectorPriority(left.connector) - getConnectorPriority(right.connector))
        .filter((option, index, allOptions) => (
            allOptions.findIndex((candidate) => candidate.label === option.label) === index
        ))

    const coinbaseConnector = walletOptions.find((option) => option.label === 'Coinbase Wallet')?.connector
    const injectedConnector = walletOptions.find((option) => option.connector.id === 'injected')?.connector

    const connectWallet = async (connector: Connector) => connectAsync({
        connector,
        chainId: customFuji.id,
    })

    const connectCoinbase = async () => {
        if (!coinbaseConnector) {
            throw new Error('Coinbase Wallet is not available in this build.')
        }

        return connectWallet(coinbaseConnector)
    }

    const connectInjected = async () => {
        if (!injectedConnector) {
            throw new Error('No browser wallet was detected.')
        }

        return connectWallet(injectedConnector)
    }

    return {
        coinbaseConnector,
        connectWallet,
        connectCoinbase,
        connectInjected,
        error,
        hasInjectedConnector: Boolean(injectedConnector),
        isPending,
        pendingConnector,
        walletOptions,
    }
}
