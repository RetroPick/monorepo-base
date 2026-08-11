package com.retropick.core.model

import java.math.BigDecimal

data class Market(
    val id: String,
    val question: String,
    val description: String?,
    val category: MarketCategory,
    val tokens: List<OutcomeToken>,
    val endTimestamp: Long,
    val volume24hUsd: BigDecimal,
    val liquidityUsd: BigDecimal,
    val isResolved: Boolean,
    val resolvedOutcomeTokenId: String? = null,
    val feeBps: Int = 0
)

data class OutcomeToken(
    val tokenId: String,
    val outcomeLabel: String, // e.g. "YES", "NO"
    val price: BigDecimal,
    val bestBid: BigDecimal?,
    val bestAsk: BigDecimal?,
    val priceChange24h: BigDecimal?
)

enum class MarketCategory {
    POLITICS,
    CRYPTO,
    SPORTS,
    MACRO,
    CULTURE,
    OTHER
}
