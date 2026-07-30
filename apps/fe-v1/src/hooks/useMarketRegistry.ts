import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { ABIS, getContractAddresses } from '../contracts/config';

export function useMarketRegistry() {
    const { address } = useAccount();
    const chainId = useChainId();
    const registryAddress = getContractAddresses(chainId).MarketRegistry;
    const { data: hash, writeContractAsync, isPending, isError, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const redeem = async (marketId: string | number) => {
        if (!registryAddress) {
            throw new Error('MarketRegistry is not configured for this chain');
        }
        try {
            const txHash = await writeContractAsync({
                address: registryAddress,
                abi: ABIS.MarketRegistry,
                functionName: 'redeem',
                args: [BigInt(marketId)],
                account: address,
            } as unknown as Parameters<typeof writeContractAsync>[0]);
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
