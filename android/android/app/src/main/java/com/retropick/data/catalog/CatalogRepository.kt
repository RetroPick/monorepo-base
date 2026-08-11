package com.retropick.data.catalog

import com.retropick.core.model.Event
import com.retropick.core.model.Market
import com.retropick.core.model.MarketCategory
import kotlinx.coroutines.flow.Flow

interface CatalogRepository {
    fun getEventFeed(): Flow<List<Event>>
    suspend fun getMarketDetail(marketId: String): Result<Market>
    suspend fun searchMarkets(query: String): List<Market>
    fun getMarketsByCategory(category: MarketCategory): Flow<List<Market>>
}

class CatalogRepositoryImpl : CatalogRepository {
    private val mockEvents = listOf(
        Event(
            id = "evt-1",
            title = "US Presidential Election 2028",
            slug = "us-presidential-election-2028",
            description = "Predicting the outcome of the 2028 US Presidential Election.",
            category = MarketCategory.POLITICS,
            iconUrl = null,
            markets = listOf(
                Market(
                    id = "mkt-101",
                    question = "Will Candidate A win the 2028 Election?",
                    description = "Resolves to YES if Candidate A wins.",
                    category = MarketCategory.POLITICS,
                    tokens = listOf(
                        com.retropick.core.model.OutcomeToken("tok-yes-1", "YES", java.math.BigDecimal("0.54"), java.math.BigDecimal("0.53"), java.math.BigDecimal("0.55"), java.math.BigDecimal("0.02")),
                        com.retropick.core.model.OutcomeToken("tok-no-1", "NO", java.math.BigDecimal("0.46"), java.math.BigDecimal("0.45"), java.math.BigDecimal("0.47"), java.math.BigDecimal("-0.02"))
                    ),
                    endTimestamp = 1857168000000L,
                    volume24hUsd = java.math.BigDecimal("1250000.00"),
                    liquidityUsd = java.math.BigDecimal("450000.00"),
                    isResolved = false
                )
            ),
            activeVolume24h = "$1.25M",
            isFeatured = true
        ),
        Event(
            id = "evt-2",
            title = "Bitcoin Price Target Q4 2026",
            slug = "btc-price-q4-2026",
            description = "Will Bitcoin surpass $150,000 before December 31, 2026?",
            category = MarketCategory.CRYPTO,
            iconUrl = null,
            markets = listOf(
                Market(
                    id = "mkt-102",
                    question = "BTC > $150k in 2026?",
                    description = "Resolves based on Binance BTC/USDT pair.",
                    category = MarketCategory.CRYPTO,
                    tokens = listOf(
                        com.retropick.core.model.OutcomeToken("tok-yes-2", "YES", java.math.BigDecimal("0.68"), java.math.BigDecimal("0.67"), java.math.BigDecimal("0.69"), java.math.BigDecimal("0.05")),
                        com.retropick.core.model.OutcomeToken("tok-no-2", "NO", java.math.BigDecimal("0.32"), java.math.BigDecimal("0.31"), java.math.BigDecimal("0.33"), java.math.BigDecimal("-0.05"))
                    ),
                    endTimestamp = 1798761600000L,
                    volume24hUsd = java.math.BigDecimal("3400000.00"),
                    liquidityUsd = java.math.BigDecimal("890000.00"),
                    isResolved = false
                )
            ),
            activeVolume24h = "$3.40M",
            isFeatured = true
        )
    )

    override fun getEventFeed(): Flow<List<Event>> = kotlinx.coroutines.flow.flowOf(mockEvents)

    override suspend fun getMarketDetail(marketId: String): Result<Market> {
        val found = mockEvents.flatMap { it.markets }.find { it.id == marketId }
            ?: mockEvents.first().markets.first()
        return Result.success(found)
    }

    override suspend fun searchMarkets(query: String): List<Market> {
        return mockEvents.flatMap { it.markets }.filter { 
            it.question.contains(query, ignoreCase = true) 
        }
    }

    override fun getMarketsByCategory(category: MarketCategory): Flow<List<Market>> {
        return kotlinx.coroutines.flow.flowOf(
            mockEvents.flatMap { it.markets }.filter { it.category == category }
        )
    }
}
