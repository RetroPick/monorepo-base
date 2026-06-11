import { useSignTypedData, useAccount } from 'wagmi';
import type { TypedDataDomain } from 'viem';
import { appDefaultNetwork } from '@/config';

type OrderField = { name: string; type: string };

const ORDER_TYPES_SWAP: { Order: OrderField[] } = {
    Order: [
        { name: 'sessionId', type: 'string' },
        { name: 'action', type: 'string' },
        { name: 'fromOutcome', type: 'uint256' },
        { name: 'toOutcome', type: 'uint256' },
        { name: 'delta', type: 'string' },
    ],
};

const ORDER_TYPES_SIMPLE: { Order: OrderField[] } = {
    Order: [
        { name: 'sessionId', type: 'string' },
        { name: 'action', type: 'string' },
        { name: 'outcomeIndex', type: 'uint256' },
        { name: 'delta', type: 'string' },
    ],
};

export function useYellowSession() {
    const { address } = useAccount();
    const { signTypedDataAsync, isPending, isError, isSuccess, error } = useSignTypedData();

    const signOrder = async (
        sessionId: string,
        action: 'buy' | 'sell' | 'swap',
        outcomeIndexOrFrom: number,
        delta: number,
        toOutcome?: number,
    ) => {
        const chainIdNum = Number(appDefaultNetwork.id);
        if (!Number.isFinite(chainIdNum)) {
            throw new Error("Invalid default network chain id for EIP-712 domain.");
        }
        const domain: TypedDataDomain = {
            name: "RetroPick Relayer",
            version: "1",
            chainId: chainIdNum,
        };

        if (action === 'swap' && toOutcome !== undefined) {
            const message = {
                sessionId,
                action,
                delta: delta.toString(),
                fromOutcome: BigInt(outcomeIndexOrFrom),
                toOutcome: BigInt(toOutcome),
            };
            try {
                return await signTypedDataAsync({
                    domain,
                    types: ORDER_TYPES_SWAP,
                    primaryType: 'Order',
                    message,
                    account: address,
                });
            } catch (err) {
                console.error('Sign order failed', err);
                throw err;
            }
        }

        const message = {
            sessionId,
            action,
            delta: delta.toString(),
            outcomeIndex: BigInt(outcomeIndexOrFrom),
        };
        try {
            return await signTypedDataAsync({
                domain,
                types: ORDER_TYPES_SIMPLE,
                primaryType: 'Order',
                message,
                account: address,
            });
        } catch (err) {
            console.error('Sign order failed', err);
            throw err;
        }
    };

    return { signOrder, isPending, isError, isSuccess, error };
}
