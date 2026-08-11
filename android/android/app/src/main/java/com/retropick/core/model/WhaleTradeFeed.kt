package com.retropick.core.model

import java.math.BigDecimal

data class WhaleTradeFeed(
    val signals: List<WhaleSignal>,
    val totalNotional24hUsd: BigDecimal,
    val activeWhalesCount: Int,
    val lastObservedTimestamp: Long
)

data class WhaleScoreDetails(
    val score: Int, // 0 - 100
    val notionalComponent: Double,
    val impactComponent: Double,
    val walletPriorComponent: Double,
    val reasonCodes: List<String>
)
