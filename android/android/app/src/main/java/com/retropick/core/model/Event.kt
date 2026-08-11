package com.retropick.core.model

data class Event(
    val id: String,
    val title: String,
    val slug: String,
    val description: String?,
    val category: MarketCategory,
    val iconUrl: String?,
    val markets: List<Market>,
    val activeVolume24h: String,
    val isFeatured: Boolean = false
)
