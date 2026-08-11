package com.retropick.core.model

import java.math.BigDecimal

data class Order(
    val orderId: String,
    val clientOrderId: String,
    val marketId: String,
    val tokenId: String,
    val side: OrderSide,
    val orderType: OrderType,
    val price: BigDecimal,
    val originalSize: BigDecimal,
    val filledSize: BigDecimal,
    val status: OrderStatus,
    val createdAt: Long,
    val updatedAt: Long,
    val transactionHash: String? = null
)

enum class OrderSide {
    BUY,
    SELL
}

enum class OrderType {
    LIMIT,
    MARKETABLE_LIMIT
}

enum class OrderStatus {
    DRAFT,
    VALIDATED,
    SIGNING,
    SUBMITTING,
    ACCEPTED,
    OPEN,
    PARTIALLY_FILLED,
    FILLED,
    CANCELLED,
    EXPIRED,
    REJECTED,
    RECONCILIATION_REQUIRED
}

data class Fill(
    val fillId: String,
    val orderId: String,
    val price: BigDecimal,
    val size: BigDecimal,
    val timestamp: Long,
    val feeUsd: BigDecimal
)
