# 11 — Frontend Hooks and State

## 1. WebSocket event type

```ts
export type EventEnvelope = {
  seq: number
  type: string
  channel: string
  scope: 'public' | 'user' | 'ops'
  templateId?: string
  epochId?: number
  userAddress?: string
  payload: any
  createdAt: string
}
```

## 2. Realtime store

```ts
type RealtimeState = {
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'
  lastSeqByChannel: Record<string, number>
  subscriptions: Set<string>
  subscribe: (channels: string[]) => void
  unsubscribe: (channels: string[]) => void
}
```

## 3. `useRealtimeConnection`

Responsibilities:

```txt
open WebSocket
authenticate
restore subscriptions
track lastSeq
handle ping/pong
handle reconnect
handle resync_required
dispatch events
```

## 4. `useMarketSnapshot`

```ts
export function useMarketSnapshot(templateId: string) {
  return useQuery({
    queryKey: ['market', templateId],
    queryFn: () => apiGet(`/api/v1/markets/${templateId}`),
    staleTime: 10_000,
  })
}
```

## 5. `useMarketRealtime`

```ts
export function useMarketRealtime(templateId: string, feedId: string) {
  const queryClient = useQueryClient()

  useRealtimeSubscription(`market:${templateId}`, event => {
    queryClient.setQueryData(['market', templateId], old =>
      old ? applyMarketEvent(old, event) : old
    )
  })

  useRealtimeSubscription(`oracle:${feedId}`, event => {
    queryClient.setQueryData(['market', templateId], old =>
      old ? applyOracleEvent(old, event) : old
    )
  })
}
```

## 6. `usePriceChart`

```ts
export function usePriceChart(feedId: string, intervalSec: number) {
  const queryClient = useQueryClient()

  const candles = useQuery({
    queryKey: ['candles', feedId, intervalSec],
    queryFn: () => apiGet(`/api/v1/chart/${feedId}?interval=${intervalSec}`),
  })

  useRealtimeSubscription(`chart:${feedId}:${intervalSec}`, event => {
    if (event.type === 'candle_updated') {
      queryClient.setQueryData(['candles', feedId, intervalSec], old =>
        upsertCandle(old, event.payload)
      )
    }
  })

  return candles
}
```

## 7. `useUserBalance`

```ts
export function useUserBalance(address?: string) {
  const queryClient = useQueryClient()

  const balance = useQuery({
    queryKey: ['balance', address],
    enabled: !!address,
    queryFn: () => apiGet('/api/v1/user/balance'),
  })

  useRealtimeSubscription(address ? `user:${address.toLowerCase()}` : null, event => {
    if (event.type === 'balance_update') {
      queryClient.setQueryData(['balance', address], event.payload)
    }
  })

  return balance
}
```

## 8. Wallet adapter

```ts
export interface WalletProviderAdapter {
  getAddress(): Promise<string>
  getChainId(): Promise<number>
  switchChain(chainId: number): Promise<void>
  getWalletClient(): Promise<unknown>
  signMessage(message: string): Promise<string>
  sendTransaction(tx: unknown): Promise<string>
}
```

Implement:

```txt
WagmiWalletAdapter
ReownWalletAdapter
ThirdwebWalletAdapter
```

## 9. Event dedupe

```ts
function shouldApplyEvent(event: EventEnvelope): boolean {
  const last = lastSeqByChannel[event.channel] ?? 0
  if (event.seq <= last) return false
  lastSeqByChannel[event.channel] = event.seq
  return true
}
```
