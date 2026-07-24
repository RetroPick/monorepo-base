import { useAccount, useReadContract } from 'wagmi';
import { ABIS, CONTRACT_ADDRESSES } from '../contracts/config';

const ZERO = '0x0000000000000000000000000000000000000000' as const;

export function useExecutionLedger(marketId?: string | number, outcomeIndex?: number) {
    const { address } = useAccount();
    const ledgerAddr = CONTRACT_ADDRESSES.ExecutionLedger;
    const enabled =
        !!address &&
        marketId !== undefined &&
        outcomeIndex !== undefined &&
        ledgerAddr !== ZERO;

    const { data: positionRaw, isLoading, refetch, isError } = useReadContract({
        address: ledgerAddr,
        abi: ABIS.ExecutionLedger,
        functionName: 'positionOf',
        args: address && marketId !== undefined && outcomeIndex !== undefined
            ? [address, BigInt(marketId), outcomeIndex]
            : undefined,
        query: { enabled },
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
