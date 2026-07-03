# Sources and Assumptions

## Official sources to consult during implementation

- GoodDollar APIs & SDKs: https://docs.gooddollar.org/for-developers/apis-and-sdks
- GoodDollar Sybil Resistance: https://docs.gooddollar.org/for-developers/apis-and-sdks/sybil-resistance
- G$ token integration: https://docs.gooddollar.org/for-developers/developer-guides/how-to-integrate-the-gusd-token
- G$ streaming: https://docs.gooddollar.org/for-developers/developer-guides/use-gusd-streaming
- GoodDollar GoodSDKs: https://github.com/GoodDollar/GoodSDKs
- Superfluid Super Tokens: https://docs.superfluid.org/docs/concepts/overview/super-tokens
- Celo AI docs: https://docs.celo.org/build-on-celo/build-with-ai/overview
- Reown: https://reown.com/

## RetroPick assumptions from current architecture

- RetroPick has MarketEngine as the on-chain settlement source.
- Current market lifecycle is open → lock → resolve → claim.
- Backend has Go API, indexer, keeper, price-worker, funding-worker, alert worker.
- Postgres projections and realtime_events are core UX infrastructure.
- Frontend uses wallet writes and indexed API reads.

## Implementation assumptions to verify in repo

- Exact `withdrawFees` signature.
- Exact fee event emitted by MarketEngine.
- Exact stake token interface and decimals behavior.
- Whether G$ receiver needs `onTokenTransfer` or if approve/transferFrom is enough for MVP.
- Exact EngagementRewards app registration and claim payload format.
- Exact GoodID SDK function signatures for Viem/Wagmi.
