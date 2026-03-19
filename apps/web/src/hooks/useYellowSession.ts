import { useSignTypedData, useAccount } from 'wagmi';

export function useYellowSession() {
    const { address } = useAccount();
    const { signTypedDataAsync, isPending, isError, isSuccess, error } = useSignTypedData();

    const signOrder = async (
        sessionId: string,
        action: 'buy' | 'sell' | 'swap',
        outcomeIndexOrFrom: number,
        delta: number,
        toOutcome?: number
    ) => {
        // EIP-712 Domain for RetroPick Relayer
        const domain = {
            name: 'RetroPick Relayer',
            version: '1',
            chainId: 43113,
        };

        let types: any = {};
        let message: any = {
            sessionId,
            action,
            delta: delta.toString()
        };

        if (action === 'swap' && toOutcome !== undefined) {
            types = {
                Order: [
                    { name: 'sessionId', type: 'string' },
                    { name: 'action', type: 'string' },
                    { name: 'fromOutcome', type: 'uint256' },
                    { name: 'toOutcome', type: 'uint256' },
                    { name: 'delta', type: 'string' }
                ]
            };
            message.fromOutcome = BigInt(outcomeIndexOrFrom);
            message.toOutcome = BigInt(toOutcome);
        } else {
            types = {
                Order: [
                    { name: 'sessionId', type: 'string' },
                    { name: 'action', type: 'string' },
                    { name: 'outcomeIndex', type: 'uint256' },
                    { name: 'delta', type: 'string' }
                ]
            };
            message.outcomeIndex = BigInt(outcomeIndexOrFrom);
        }

        try {
            const signature = await signTypedDataAsync({
                domain,
                types,
                primaryType: 'Order',
                message,
                account: address,
            } as any);
            return signature;
        } catch (err) {
            console.error("Sign order failed", err);
            throw err;
        }
    };

    return { signOrder, isPending, isError, isSuccess, error };
}
