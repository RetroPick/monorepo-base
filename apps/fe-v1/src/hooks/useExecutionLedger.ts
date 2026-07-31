import { useAccount, useChainId, useReadContract } from 'wagmi';
import { ABIS, getContractAddresses } from '../contracts/config';

export function useExecutionLedger(marketId?: string | number, outcomeIndex?: number) {
    const { address } = useAccount();
    const chainId = useChainId();
    const ledgerAddress = getContractAddresses(chainId).ExecutionLedger;

    const { data: positionRaw, isLoading, refetch, isError } = useReadContract({
        address: ledgerAddress,
        abi: ABIS.ExecutionLedger,
        functionName: 'positionOf',
        args: address && marketId !== undefined && outcomeIndex !== undefined
            ? [address, BigInt(marketId), outcomeIndex]
            : undefined,
        query: {
            enabled: !!ledgerAddress && !!address && marketId !== undefined && outcomeIndex !== undefined,
        }
    });

    // Format to a readable number (assuming 18 decimals like ERC20)
    const position = positionRaw ? Number(positionRaw) / 1e18 : 0;

    return {
        positionRaw,
        position,
        isLoading,
        isError,
        refetch
    };
}
