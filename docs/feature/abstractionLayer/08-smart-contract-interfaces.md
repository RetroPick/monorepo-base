# 08 — Smart Contract Interfaces

This assumes the Base/EVM MVP.

## 1. Contract topology

```txt
Base USDC
  -> DepositRouter
  -> UserBalanceVault
  -> MarketEngine
```

## 2. MarketEngine remains USDC-only

```solidity
interface IMarketEngine {
    function depositFor(
        address user,
        bytes32 marketId,
        uint8 outcomeId,
        uint256 amount
    ) external;
}
```

MarketEngine should not know about LI.FI, Arbitrum ETH, Polygon USDT, or any source token.

## 3. UserBalanceVault

```solidity
interface IUserBalanceVault {
    event BalanceCredited(address indexed user, bytes32 indexed depositId, uint256 amount);
    event MarketEntered(address indexed user, bytes32 indexed marketId, uint8 indexed outcomeId, uint256 amount);
    event Withdrawn(address indexed user, address indexed receiver, uint256 amount);

    function creditFromRouter(
        address user,
        uint256 amount,
        bytes32 depositId
    ) external;

    function enterMarket(
        bytes32 marketId,
        uint8 outcomeId,
        uint256 amount
    ) external;

    function withdraw(
        uint256 amount,
        address receiver
    ) external;

    function availableBalanceOf(address user) external view returns (uint256);
    function lockedBalanceOf(address user) external view returns (uint256);
}
```

## 4. DepositRouter

Recommended MVP: backend relayer credit after verified transfer.

```solidity
contract DepositRouter {
    IERC20 public immutable usdc;
    IUserBalanceVault public immutable vault;

    mapping(bytes32 => bool) public usedDepositIds;

    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    event DepositCredited(
        bytes32 indexed depositId,
        address indexed user,
        uint256 amount
    );

    constructor(address _usdc, address _vault) {
        usdc = IERC20(_usdc);
        vault = IUserBalanceVault(_vault);
    }

    function creditDeposit(
        bytes32 depositId,
        address user,
        uint256 amount
    ) external onlyRole(RELAYER_ROLE) {
        require(!usedDepositIds[depositId], "DEPOSIT_USED");
        usedDepositIds[depositId] = true;

        require(usdc.transfer(address(vault), amount), "TRANSFER_TO_VAULT_FAILED");

        vault.creditFromRouter(user, amount, depositId);

        emit DepositCredited(depositId, user, amount);
    }
}
```

## 5. Why backend relayer first

LI.FI can deliver tokens to a destination address, but if it only sends a token transfer, the receiving contract does not know:

```txt
which user
which funding intent
which selected route
```

Therefore MVP uses:

```txt
LI.FI sends Base USDC to DepositRouter
Backend verifies transfer
Backend relayer calls creditDeposit(depositId, user, amount)
```

## 6. Required controls

```txt
creditDeposit only callable by relayer role
depositId one-time use
amount must match verified transfer
relayer actions mirrored in backend ledger
vault balance reconciliation
```

## 7. On-chain vs backend balance accounting

### Fully on-chain balance accounting

Pros:

```txt
User can withdraw directly
Transparent balances
Less backend custody trust
```

Cons:

```txt
More contract complexity
More gas for balance mutations
```

### Backend balance accounting with vault custody

Pros:

```txt
Faster product iteration
Simpler early MVP
```

Cons:

```txt
More custodial trust assumptions
Requires stronger compliance/security
```

Recommended for RetroPick:

```txt
Use on-chain UserBalanceVault if this is real-money DeFi.
Use backend balance mirror for UI and analytics.
```

## 8. Market entry

```solidity
function enterMarket(
    bytes32 marketId,
    uint8 outcomeId,
    uint256 amount
) external {
    require(available[msg.sender] >= amount, "INSUFFICIENT_BALANCE");

    available[msg.sender] -= amount;
    locked[msg.sender] += amount;

    usdc.approve(address(marketEngine), amount);
    marketEngine.depositFor(msg.sender, marketId, outcomeId, amount);

    locked[msg.sender] -= amount;

    emit MarketEntered(msg.sender, marketId, outcomeId, amount);
}
```

## 9. Direct deposit-and-enter later

Later, add optional intent metadata:

```txt
autoEnterMarketId
autoEnterOutcomeId
autoEnterMaxAmount
autoEnterBeforeLockBuffer
```

Rule:

```txt
if market is open and now < lockAt - safetyBuffer:
  enter market
else:
  credit balance only
```

## 10. Emergency recovery

```solidity
function rescueToken(address token, address to, uint256 amount) external onlyRole(RESCUE_ROLE) {
    require(token != address(usdc), "NO_RESCUE_USDC");
    IERC20(token).transfer(to, amount);
}
```

For USDC:

```txt
Only surplus over liabilities may be moved.
Require multisig + timelock in production.
```
