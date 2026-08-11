package com.retropick.core.model

import java.math.BigDecimal

data class BetaBinomialWinRate(
    val shrunkWinRate: Double?, // Null if sampleSize < 15
    val pLow90: Double?,        // 5th percentile
    val pHigh90: Double?,       // 95th percentile
    val sampleSize: Int,
    val sampleGatePassed: Boolean
)

data class WalletPerformanceMetrics(
    val address: String,
    val winRateDetails: BetaBinomialWinRate,
    val pnlWeightedWinRate: Double?,
    val sharpeRatioEstimate: Double?,
    val totalVolume30dUsd: BigDecimal,
    val totalProfit30dUsd: BigDecimal,
    val hhiConcentrationIndex: Double // Herfindahl-Hirschman Index
)

data class TopHolder(
    val address: String,
    val ensName: String?,
    val outcomeLabel: String,
    val sharesHeld: BigDecimal,
    val positionValueUsd: BigDecimal,
    val portfolioPercentage: Double
)
