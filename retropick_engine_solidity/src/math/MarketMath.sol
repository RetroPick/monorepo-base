// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MarketTypes} from "../types/MarketTypes.sol";

library MarketMath {
    using MarketTypes for MarketTypes.Epoch;

    error MathOverflow();
    error NoWinningOutcome();

    uint256 internal constant BPS_DENOMINATOR = MarketTypes.BPS_DENOMINATOR;

    function computeSwitch(uint256 grossAmount, uint16 switchFeeBps) internal pure returns (uint256 net, uint256 fee) {
        if (switchFeeBps == 0) return (grossAmount, 0);
        fee = (grossAmount * uint256(switchFeeBps) + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        if (fee > grossAmount) revert MathOverflow();
        net = grossAmount - fee;
    }

    function computeSettlementFee(uint256 totalPool, uint256 losingPool, uint16 feeBps, bool feeOnLosingPool)
        internal
        pure
        returns (uint256)
    {
        uint256 base = feeOnLosingPool ? losingPool : totalPool;
        return (base * uint256(feeBps)) / BPS_DENOMINATOR;
    }

    function winningPoolTotal(uint256 winningMask, uint8 outcomeCount, uint256[8] memory outcomePools)
        internal
        pure
        returns (uint256 sum)
    {
        for (uint256 i = 0; i < outcomeCount; i++) {
            if ((winningMask >> i) & 1 == 1) {
                sum += outcomePools[i];
            }
        }
    }

    function computeClaimLiabilityComponents(
        uint256 totalPool,
        uint256 winningPool,
        uint16 feeBps,
        bool feeOnLosingPool
    ) internal pure returns (uint256 claimLiabilityTotal, uint256 settlementFee, uint256 distributableLosingPool) {
        if (winningPool == 0) revert NoWinningOutcome();
        if (totalPool < winningPool) revert MathOverflow();
        uint256 losingPool = totalPool - winningPool;
        settlementFee = computeSettlementFee(totalPool, losingPool, feeBps, feeOnLosingPool);
        if (losingPool < settlementFee) revert MathOverflow();
        distributableLosingPool = losingPool - settlementFee;
        claimLiabilityTotal = winningPool + distributableLosingPool;
    }

    function computeEpochClaimLiability(MarketTypes.Epoch memory epoch, uint16 feeBps, bool feeOnLosingPool)
        internal
        pure
        returns (uint256 claimLiabilityTotal, uint256 settlementFee, uint256 distributableLosingPool)
    {
        uint256 wp = epoch.winningPoolTotal();
        return computeClaimLiabilityComponents(epoch.totalPool, wp, feeBps, feeOnLosingPool);
    }

    function computeEpochClaimLiabilityStorage(MarketTypes.Epoch storage epoch, uint16 feeBps, bool feeOnLosingPool)
        internal
        view
        returns (uint256 claimLiabilityTotal, uint256 settlementFee, uint256 distributableLosingPool)
    {
        uint256 wp = 0;
        for (uint256 i = 0; i < epoch.outcomeCount; i++) {
            if ((epoch.winningOutcomeMask >> i) & 1 == 1) {
                wp += epoch.outcomePools[i];
            }
        }
        return computeClaimLiabilityComponents(epoch.totalPool, wp, feeBps, feeOnLosingPool);
    }

    function totalWinningStake(uint256 winningMask, uint8 outcomeCount, uint256[8] memory stakes)
        internal
        pure
        returns (uint256 s)
    {
        for (uint256 i = 0; i < outcomeCount; i++) {
            if ((winningMask >> i) & 1 == 1) {
                s += stakes[i];
            }
        }
    }

    function computeTotalUserEntitlementResolved(
        MarketTypes.Epoch memory epoch,
        uint256[8] memory stakes,
        uint16 settlementFeeBps,
        bool feeOnLosingPool
    ) internal pure returns (uint256) {
        uint256 userWinning = totalWinningStake(epoch.winningOutcomeMask, epoch.outcomeCount, stakes);
        if (userWinning == 0) return 0;
        uint256 winningPool = epoch.winningPoolTotal();
        (,, uint256 distributableLosing) =
            computeClaimLiabilityComponents(epoch.totalPool, winningPool, settlementFeeBps, feeOnLosingPool);
        uint256 proRata = (userWinning * distributableLosing) / winningPool;
        return userWinning + proRata;
    }

    function computeClaimPayout(MarketTypes.Epoch memory epoch, uint256[8] memory stakes, uint256 claimsReserveTotal)
        internal
        pure
        returns (uint256 payout, uint256 userWinningStake_)
    {
        userWinningStake_ = totalWinningStake(epoch.winningOutcomeMask, epoch.outcomeCount, stakes);
        if (userWinningStake_ == 0) return (0, 0);

        uint256 entitlement =
            computeTotalUserEntitlementResolved(epoch, stakes, epoch.settlementFeeBps, epoch.feeOnLosingPool);

        if (epoch.remainingWinningStake == userWinningStake_) {
            payout = claimsReserveTotal;
        } else {
            payout = entitlement;
        }
        return (payout, userWinningStake_);
    }

    /// @dev Avoids copying full `Epoch` to memory on each claim (L2 hot path).
    function computeClaimPayoutStorage(
        MarketTypes.Epoch storage epoch,
        uint256[8] memory stakes,
        uint256 claimsReserveTotal
    ) internal view returns (uint256 payout, uint256 userWinningStake_) {
        userWinningStake_ = totalWinningStake(epoch.winningOutcomeMask, epoch.outcomeCount, stakes);
        if (userWinningStake_ == 0) return (0, 0);

        uint256 winningPool = 0;
        for (uint256 i = 0; i < epoch.outcomeCount; i++) {
            if ((epoch.winningOutcomeMask >> i) & 1 == 1) {
                winningPool += epoch.outcomePools[i];
            }
        }
        (,, uint256 distributableLosing) =
            computeClaimLiabilityComponents(epoch.totalPool, winningPool, epoch.settlementFeeBps, epoch.feeOnLosingPool);
        uint256 entitlement = userWinningStake_ + (userWinningStake_ * distributableLosing) / winningPool;

        if (epoch.remainingWinningStake == userWinningStake_) {
            payout = claimsReserveTotal;
        } else {
            payout = entitlement;
        }
        return (payout, userWinningStake_);
    }

    function computeRefundTotal(uint256 totalStake) internal pure returns (uint256) {
        return totalStake;
    }

    function reserveClaimsFromActive(MarketTypes.Ledger storage ledger, uint256 amount) internal {
        ledger.activeCollateralTotal = _sub(ledger.activeCollateralTotal, amount);
        ledger.claimsReserveTotal += amount;
    }

    function reserveFeesFromActive(MarketTypes.Ledger storage ledger, uint256 amount) internal {
        ledger.activeCollateralTotal = _sub(ledger.activeCollateralTotal, amount);
        ledger.feeReserveTotal += amount;
    }

    function releaseClaimOnWithdraw(MarketTypes.Ledger storage ledger, uint256 amount) internal {
        ledger.claimsReserveTotal = _sub(ledger.claimsReserveTotal, amount);
    }

    function releaseFeeOnWithdraw(MarketTypes.Ledger storage ledger, uint256 amount) internal {
        ledger.feeReserveTotal = _sub(ledger.feeReserveTotal, amount);
    }

    function increaseActiveCollateral(MarketTypes.Ledger storage ledger, uint256 amount) internal {
        ledger.activeCollateralTotal += amount;
    }

    function decreaseActiveCollateral(MarketTypes.Ledger storage ledger, uint256 amount) internal {
        ledger.activeCollateralTotal = _sub(ledger.activeCollateralTotal, amount);
    }

    function _sub(uint256 a, uint256 b) private pure returns (uint256) {
        if (a < b) revert MathOverflow();
        return a - b;
    }
}
