import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConfig } from 'wagmi';
import { ABIS, CONTRACT_ADDRESSES, REGISTRY_CHAIN_ID } from '../contracts/config';

export function useMarketRegistry() {
    const { address } = useAccount();
    const { chains } = useConfig();
    const chain = chains.find((c) => c.id === REGISTRY_CHAIN_ID);
    const { data: hash, writeContractAsync, isPending, isError, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const redeem = async (marketId: string | number) => {
        try {
            if (!address) throw new Error('Sign in to redeem.');
            if (!chain) {
                throw new Error(`Chain ${REGISTRY_CHAIN_ID} is not enabled in the wallet config.`);
            }
            const txHash = await writeContractAsync({
                address: CONTRACT_ADDRESSES.MarketRegistry,
                abi: ABIS.MarketRegistry,
                functionName: 'redeem',
                args: [BigInt(marketId)],
                chain,
                account: address,
            });
            return txHash;
        } catch (err: unknown) {
            console.error("Redeem failed:", err);
            throw err;
        }
    };

    return {
        redeem,
        isPending,
        isConfirming,
        isSuccess,
        error,
        hash
    };
}
