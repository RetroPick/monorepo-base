package com.retropick.data.intelligence

import com.retropick.core.model.PaperCopyAccount
import com.retropick.core.model.PaperCopyPosition
import com.retropick.core.model.PaperCopyStatus
import com.retropick.core.model.WhaleSignal
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

class PaperCopyEngine {
    private val _accountState = MutableStateFlow(PaperCopyAccount())
    val accountState: StateFlow<PaperCopyAccount> = _accountState.asStateFlow()

    private val _positionsState = MutableStateFlow<List<PaperCopyPosition>>(emptyList())
    val positionsState: StateFlow<List<PaperCopyPosition>> = _positionsState.asStateFlow()

    fun openPaperCopyTrade(
        signal: WhaleSignal,
        copyAmountUsd: BigDecimal = BigDecimal("500.00")
    ): Result<PaperCopyPosition> {
        val currentAccount = _accountState.value
        if (currentAccount.virtualBalanceUsd < copyAmountUsd) {
            return Result.failure(Exception("Insufficient virtual balance for Paper Copy trade"))
        }

        // Calculate virtual shares based on assumed price from signal
        val assumedPrice = BigDecimal("0.55") // Standard quote price
        val shares = copyAmountUsd.divide(assumedPrice, 4, RoundingMode.HALF_UP)

        val newPosition = PaperCopyPosition(
            paperTradeId = "paper-" + UUID.randomUUID().toString().take(8),
            targetTraderAddress = signal.traderAddress,
            targetTraderName = signal.traderPseudonym ?: signal.traderAddress.take(8),
            marketId = signal.marketId,
            marketQuestion = signal.marketQuestion,
            outcomeLabel = signal.outcomeLabel,
            entryPrice = assumedPrice,
            currentPrice = BigDecimal("0.62"), // Simulated price move
            virtualSharesSize = shares,
            virtualStakeUsd = copyAmountUsd,
            unrealizedPnLUsd = copyAmountUsd.multiply(BigDecimal("0.127")), // +12.7% simulated PnL
            returnPercentage = 12.7,
            openedTimestamp = System.currentTimeMillis(),
            status = PaperCopyStatus.ACTIVE
        )

        val updatedPositions = _positionsState.value + newPosition
        val newBalance = currentAccount.virtualBalanceUsd.subtract(copyAmountUsd)
        val newAllocated = currentAccount.allocatedCopyUsd.add(copyAmountUsd)

        _positionsState.value = updatedPositions
        _accountState.value = currentAccount.copy(
            virtualBalanceUsd = newBalance,
            allocatedCopyUsd = newAllocated,
            activePositionsCount = updatedPositions.size
        )

        return Result.success(newPosition)
    }

    fun closePaperCopyTrade(paperTradeId: String): Result<Boolean> {
        val currentPositions = _positionsState.value.toMutableList()
        val index = currentPositions.indexOfFirst { it.paperTradeId == paperTradeId }
        if (index != -1) {
            val pos = currentPositions[index]
            val returnPayout = pos.virtualStakeUsd.add(pos.unrealizedPnLUsd)

            currentPositions[index] = pos.copy(status = PaperCopyStatus.CLOSED_WIN)
            _positionsState.value = currentPositions

            val account = _accountState.value
            _accountState.value = account.copy(
                virtualBalanceUsd = account.virtualBalanceUsd.add(returnPayout),
                allocatedCopyUsd = account.allocatedCopyUsd.subtract(pos.virtualStakeUsd),
                totalPaperPnLUsd = account.totalPaperPnLUsd.add(pos.unrealizedPnLUsd),
                activePositionsCount = currentPositions.count { it.status == PaperCopyStatus.ACTIVE }
            )
            return Result.success(true)
        }
        return Result.failure(Exception("Position not found"))
    }
}
