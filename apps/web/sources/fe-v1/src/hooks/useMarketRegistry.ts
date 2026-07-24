import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ABIS, CONTRACT_ADDRESSES } from '../contracts/config';

export function useMarketRegistry() {
    const { address } = useAccount();
    const { data: hash, writeContractAsync, isPending, isError, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const redeem = async (marketId: string | number) => {
        try {
            const txHash = await writeContractAsync({
                address: CONTRACT_ADDRESSES.MarketRegistry,
                abi: ABIS.MarketRegistry,
                functionName: 'redeem',
                args: [BigInt(marketId)],
                account: address,
            } as any);
            return txHash;
        } catch (err: any) {
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
