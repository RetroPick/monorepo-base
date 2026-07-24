# 06 — G$ Token Integration

## Goal

Use G$ as the first-class participation and reward currency in RetroPick's GoodDollar mode.

## MVP token use

| Use case | Token |
|---|---|
| Daily micro-market entry | G$ |
| Learn-to-Predict reward | G$ |
| Invite reward | G$ |
| Sponsored campaign budget | G$ |
| Dashboard metric | G$ volume and G$ rewards |

## Integration options

### Option A — `transferAndCall`

Preferred UX if RetroPick receiver supports `onTokenTransfer`.

```text
User calls G$.transferAndCall(MarketEntryReceiver, amount, encodedMarketData)
→ token transfer + market entry in one transaction
```

Use when:

- receiving contract safely implements callback;
- actual received amount is checked;
- callback data is validated.

### Option B — `approve + transferFrom`

Fallback for compatibility.

```text
User approves MarketEngine/receiver
→ User calls deposit/enter
→ Contract transferFroms G$
```

Use when:

- receiver does not support callback;
- simpler integration is needed first;
- you want less callback risk.

## Critical G$ token considerations

```text
G$ on Celo uses 18 decimals.
G$ transfers may include protocol fee behavior.
Never assume sent amount == received amount without checking.
Frontend must show possible fee/slippage warning if needed.
```

## Contract integration pattern

```solidity
function enterWithGDollar(uint256 amount, bytes calldata marketData) external nonReentrant {
    uint256 beforeBal = gDollar.balanceOf(address(this));
    gDollar.safeTransferFrom(msg.sender, address(this), amount);
    uint256 received = gDollar.balanceOf(address(this)) - beforeBal;

    require(received > 0, "NO_G_RECEIVED");
    _enterMarket(msg.sender, received, marketData);
}
```

## Frontend requirements

- Show G$ balance prominently.
- Use tiny default amounts: 1 G$, 5 G$, 10 G$.
- Hide decimals from beginner users.
- Use copy: "Use 5 G$" not "stake 5 G$".
- Handle failed approve/deposit states separately.
- Show pending state until indexer confirms.

## Backend requirements

- Token registry supports Celo G$ production/staging/dev addresses.
- Indexer tags token symbol and decimals.
- API formats G$ amounts safely.
- Impact dashboard aggregates G$ volume and rewards.

## Testing checklist

- 18-decimal amount formatting.
- Actual received amount check.
- approve flow.
- transferAndCall callback flow if enabled.
- failed transfer handling.
- indexer projection accuracy.
- dashboard G$ totals.
