package com.retropick.data.intelligence

import com.retropick.core.model.SmartMoneyBadge
import com.retropick.core.model.WalletProfile
import com.retropick.core.model.WhaleSignal
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import java.math.BigDecimal

interface IntelligenceRepository {
    fun getWhaleFeed(): Flow<List<WhaleSignal>>
    suspend fun searchWallets(query: String): List<WalletProfile>
    suspend fun getWalletProfile(address: String): Result<WalletProfile>
    fun getSmartMoneyLeaderboard(): Flow<List<WalletProfile>>
    suspend fun getTopHolders(marketId: String): List<WalletProfile>
    suspend fun toggleFollowWallet(address: String): Boolean
}

class IntelligenceRepositoryImpl : IntelligenceRepository {
    private val mockWhaleSignals = listOf(
        WhaleSignal(
            signalId = "sig-1",
            marketId = "mkt-102",
            marketQuestion = "BTC > $150k in 2026?",
            tokenId = "tok-yes-2",
            outcomeLabel = "YES",
            traderAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            traderPseudonym = "SatoshiWhale.eth",
            notionalUsd = BigDecimal("45000.00"),
            whaleScore = 92,
            priceImpactBps = 145,
            reasonCodes = listOf("WHALE_NOTIONAL_THRESHOLD", "WHALE_PRICE_IMPACT"),
            observedAt = System.currentTimeMillis() - 300000L,
            transactionHash = "0xa1b2c3d4e5f6..."
        ),
        WhaleSignal(
            signalId = "sig-2",
            marketId = "mkt-101",
            marketQuestion = "Will Candidate A win the 2028 Election?",
            tokenId = "tok-no-1",
            outcomeLabel = "NO",
            traderAddress = "0x28C6c06298d514Db089934071355E5743bf21d60",
            traderPseudonym = "PolyAlpha",
            notionalUsd = BigDecimal("18500.00"),
            whaleScore = 78,
            priceImpactBps = 85,
            reasonCodes = listOf("WHALE_NOTIONAL_THRESHOLD"),
            observedAt = System.currentTimeMillis() - 1800000L,
            transactionHash = "0xf9e8d7c6b5a4..."
        )
    )

    private val mockProfiles = listOf(
        WalletProfile(
            address = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            ensName = "SatoshiWhale.eth",
            profileImageUrl = null,
            volume30dUsd = BigDecimal("450000.00"),
            tradesCount30d = 84,
            activeMarketsCount = 12,
            shrunkWinRate = 0.76,
            sampleSize = 42,
            badges = listOf(SmartMoneyBadge.HIGH_VOLUME, SmartMoneyBadge.CONSISTENT),
            followerCount = 1420,
            isFollowing = true
        ),
        WalletProfile(
            address = "0x28C6c06298d514Db089934071355E5743bf21d60",
            ensName = "PolyAlpha",
            profileImageUrl = null,
            volume30dUsd = BigDecimal("210000.00"),
            tradesCount30d = 45,
            activeMarketsCount = 8,
            shrunkWinRate = 0.69,
            sampleSize = 28,
            badges = listOf(SmartMoneyBadge.CONSISTENT, SmartMoneyBadge.RECENTLY_ACTIVE),
            followerCount = 890,
            isFollowing = false
        )
    )

    override fun getWhaleFeed(): Flow<List<WhaleSignal>> = flowOf(mockWhaleSignals)

    override suspend fun searchWallets(query: String): List<WalletProfile> {
        return mockProfiles.filter { 
            it.address.contains(query, ignoreCase = true) || 
            (it.ensName != null && it.ensName.contains(query, ignoreCase = true))
        }
    }

    override suspend fun getWalletProfile(address: String): Result<WalletProfile> {
        val found = mockProfiles.find { it.address.equals(address, ignoreCase = true) }
            ?: mockProfiles.first()
        return Result.success(found)
    }

    override fun getSmartMoneyLeaderboard(): Flow<List<WalletProfile>> = flowOf(mockProfiles)

    override suspend fun getTopHolders(marketId: String): List<WalletProfile> = mockProfiles

    override suspend fun toggleFollowWallet(address: String): Boolean {
        return true
    }
}
