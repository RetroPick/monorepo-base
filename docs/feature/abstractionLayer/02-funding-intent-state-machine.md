# 02 — Funding Intent State Machine

## 1. Why a new state machine

The previous deposit session state machine starts too late: it assumes a source token and source amount already exist.

For target-amount UX, the first object is not a route or transaction. It is an intent:

```txt
“I want $25 credited to my RetroPick balance.”
```

## 2. Main objects

```txt
FundingIntent
  target amount, settlement destination, user

FundingOption
  candidate route from one wallet balance to target USDC

DepositExecution
  selected route being executed

DestinationTransfer
  verified destination-chain USDC transfer

BalanceLedgerEntry
  final accounting mutation
```

## 3. FundingIntent statuses

```txt
CREATED
SCANNING_BALANCES
NO_BALANCE_OPTIONS
OPTIONS_READY
ROUTE_SELECTED
EXECUTION_STARTED
SOURCE_TX_SUBMITTED
BRIDGING
DESTINATION_TX_DETECTED
DESTINATION_USDC_VERIFIED
CREDITED
FAILED
EXPIRED
MANUAL_REVIEW
```

## 4. FundingOption statuses

```txt
CANDIDATE
QUOTE_REQUESTED
QUOTE_READY
QUOTE_FAILED
REJECTED_BY_POLICY
EXPIRED
SELECTED
```

## 5. Execution statuses

```txt
NOT_STARTED
AWAITING_APPROVAL
APPROVAL_SUBMITTED
AWAITING_ROUTE_TX
ROUTE_TX_SUBMITTED
BRIDGING
COMPLETED_BY_PROVIDER
FAILED_BY_PROVIDER
UNKNOWN
```

## 6. State transition diagram

```txt
CREATED
  -> SCANNING_BALANCES
    -> NO_BALANCE_OPTIONS
    -> OPTIONS_READY
      -> ROUTE_SELECTED
        -> EXECUTION_STARTED
          -> SOURCE_TX_SUBMITTED
            -> BRIDGING
              -> DESTINATION_TX_DETECTED
                -> DESTINATION_USDC_VERIFIED
                  -> CREDITED
```

Failure branches:

```txt
OPTIONS_READY -> EXPIRED
ROUTE_SELECTED -> EXPIRED
EXECUTION_STARTED -> FAILED
SOURCE_TX_SUBMITTED -> MANUAL_REVIEW
BRIDGING -> MANUAL_REVIEW
DESTINATION_TX_DETECTED -> MANUAL_REVIEW
```

## 7. Expiration windows

Recommended MVP:

```txt
Funding intent option TTL: 60–120 seconds
Selected route TTL: provider quote expiry, usually short
Execution observation window: 60–90 minutes
Manual review threshold: 90 minutes
Unmatched transfer review: 15–30 minutes
```

## 8. Idempotency keys

Use idempotency at every transition that mutates accounting or creates irreversible state.

```txt
funding-intent:create:{user}:{clientNonce}
funding-option:{intentId}:{sourceChain}:{sourceToken}
execution-start:{intentId}:{routeId}
source-tx:{chainId}:{txHash}
destination-transfer:{chainId}:{txHash}:{logIndex}
deposit-credit:{intentId}:{destinationTransferId}
```

## 9. What “CREDITED” means

`CREDITED` means:

```txt
Canonical USDC was verified on the settlement chain and user balance was increased.
```

It does **not** mean:

```txt
User has entered a market.
```

Market entry is a separate state machine.

## 10. Late-arrival behavior

If the route arrives late, still credit balance:

```txt
BRIDGING for too long -> MANUAL_REVIEW
Destination transfer later appears -> verify -> CREDITED
```

Do not refund automatically until you know the bridge state. Cross-chain routes can complete after the provider status is delayed.
