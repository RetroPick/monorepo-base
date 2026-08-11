package com.retropick.core.model

import java.math.BigDecimal

data class PaperCopyAccount(
    val virtualBalanceUsd: BigDecimal = BigDecimal("10000.00"),
    val allocatedCopyUsd: BigDecimal = BigDecimal.ZERO,
    val totalPaperPnLUsd: BigDecimal = BigDecimal.ZERO,
    val winRate: Double = 0.0,
    val activePositionsCount: Int = 0
)

data class PaperCopyPosition(
    val paperTradeId: String,
    val targetTraderAddress: String,
    val targetTraderName: String?,
    val marketId: String,
    val marketQuestion: String,
    val outcomeLabel: String,
    val entryPrice: BigDecimal,
    val currentPrice: BigDecimal,
    val virtualSharesSize: BigDecimal,
    val virtualStakeUsd: BigDecimal,
    val unrealizedPnLUsd: BigDecimal,
    val returnPercentage: Double,
    val openedTimestamp: Long,
    val status: PaperCopyStatus
)

enum class PaperCopyStatus {
    ACTIVE,
    CLOSED_WIN,
    CLOSED_LOSS,
    CANCELLED
}
