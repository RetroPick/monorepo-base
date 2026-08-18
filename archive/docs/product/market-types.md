# Market Types

RetroPick market types follow the on-chain `MarketTypes.MarketType` order:

| ID | Type | Default UI |
| --- | --- | --- |
| 0 | Direction | Up / Down |
| 1 | Threshold | Yes / No |
| 2 | RangeClose | Multi-outcome range |
| 3 | Velocity | Yes / No or configured outcomes |
| 4 | Ladder | Tiered outcomes |
| 5 | Convergence | Yes / No |
| 6 | Composite | Yes / No |
| 7 | Corridor | Yes / No |
| 8 | Cascade | Yes / No |

Shared labels and lifecycle helpers should be extracted only when multiple active apps consume the same tested logic.

## Oracle / Mode Matrix

| Type | Manual + Chainlink | Manual + TrustedReporter | Rolling + Chainlink | Rolling + TrustedReporter |
| --- | --- | --- | --- | --- |
| Direction | Yes | No | Yes | No |
| Threshold | Yes | Yes | Yes | No |
| RangeClose | Yes | Yes | Yes | No |
| Velocity | Yes | No | Yes | No |
| Ladder | Yes | Yes | Yes | No |
| Convergence | Yes | No | No | No |
| Composite | Yes | No | No | No |
| Corridor | No, requires OHLC | Yes | No | No |
| Cascade | No, requires OHLC | Yes | No | No |

Corridor and Cascade resolve from high/low OHLC data, so scalar Chainlink feed templates are rejected on-chain. Use `TrustedReporterAdapter` for those types until a dedicated Chainlink OHLC/history adapter exists.
