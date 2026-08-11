package com.retropick.core.model

import java.math.BigDecimal

data class WalletProfile(
    val address: String,
    val ensName: String?,
    val profileImageUrl: String?,
    val volume30dUsd: BigDecimal,
    val tradesCount30d: Int,
    val activeMarketsCount: Int,
    val shrunkWinRate: Double?, // Null if sample < 15
    val sampleSize: Int,
    val badges: List<SmartMoneyBadge>,
    val followerCount: Int = 0,
    val isFollowing: Boolean = false
)

enum class SmartMoneyBadge {
    HIGH_VOLUME,
    CONSISTENT,
    CONCENTRATED,
    RECENTLY_ACTIVE,
    TOP_HOLDER
}
