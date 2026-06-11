# Resolution Rules

Resolution is epoch-based and must match on-chain `MarketEngine` state.

## Rules

- Resolve only after the epoch reaches its configured resolution time.
- Use the template's configured oracle and market type.
- Return a winning outcome mask, refund, or void result.
- Keep trusted reporter and Chainlink adapter behavior explicit in backend/operator flows.

`@retropick/resolution-core` currently contains typed foundations and simple numeric examples only. Production resolution remains on-chain and backend-mediated.
