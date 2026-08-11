package com.retropick.core.model

import java.math.BigDecimal

data class WhaleSignal(
    val signalId: String,
    val marketId: String,
    val marketQuestion: String,
    val tokenId: String,
    val outcomeLabel: String,
    val traderAddress: String,
    val traderPseudonym: String?,
    val notionalUsd: BigDecimal,
    val whaleScore: Int, // 0 to 100
    val priceImpactBps: Int,
    val reasonCodes: List<String>, // e.g. WHALE_NOTIONAL_THRESHOLD, WHALE_PRICE_IMPACT
    val observedAt: Long,
    val transactionHash: String
)

data class UnusualActivitySignal(
    val activityId: String,
    val marketId: String,
    val signalType: String, // e.g. VELOCITY_SPIKE, CLUSTERED_FLOW, SILENT_VOLUME
    val description: String,
    val timestamp: Long,
    val isShadow: Boolean = false
)
