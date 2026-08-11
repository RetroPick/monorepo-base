package com.retropick.core.network

import com.retropick.core.model.Order
import com.retropick.core.model.OrderSide
import com.retropick.core.model.OrderStatus
import com.retropick.core.model.OrderType
import com.retropick.data.trading.OrderPreview
import java.math.BigDecimal
import java.util.UUID

class MarketsV1ApiClient(
    private val baseUrl: String = "https://api.retropick.io"
) {
    suspend fun fetchOrderPreview(
        marketId: String,
        tokenId: String,
        side: OrderSide,
        price: BigDecimal,
        size: BigDecimal
    ): Result<OrderPreview> {
        val cost = price.multiply(size)
        val fee = cost.multiply(BigDecimal("0.001")) // 10 bps builder fee
        val maxLoss = cost.add(fee)
        val maxPayout = size

        val preview = OrderPreview(
            marketId = marketId,
            tokenId = tokenId,
            side = side,
            price = price,
            size = size,
            estimatedCostUsd = cost,
            estimatedFeeUsd = fee,
            maxPayoutUsd = maxPayout,
            maxLossUsd = maxLoss,
            quoteExpirationTimestamp = System.currentTimeMillis() + 60000L // 60s TTL
        )
        return Result.success(preview)
    }

    suspend fun postSignedOrder(
        preview: OrderPreview,
        signature: String,
        idempotencyKey: String = UUID.randomUUID().toString()
    ): Result<Order> {
        // Enforce Quote TTL safety (60s limit)
        if (System.currentTimeMillis() > preview.quoteExpirationTimestamp) {
            return Result.failure(Exception("Quote TTL expired. Order creation cancelled for security."))
        }

        val order = Order(
            orderId = "clob-" + UUID.randomUUID().toString().take(12),
            clientOrderId = idempotencyKey,
            marketId = preview.marketId,
            tokenId = preview.tokenId,
            side = preview.side,
            orderType = OrderType.LIMIT,
            price = preview.price,
            originalSize = preview.size,
            filledSize = BigDecimal.ZERO,
            status = OrderStatus.OPEN,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        return Result.success(order)
    }

    suspend fun deleteOrder(orderId: String): Result<Boolean> {
        return Result.success(true)
    }

    suspend fun redeemPositions(marketId: String): Result<BigDecimal> {
        return Result.success(BigDecimal("250.00")) // Claimed PnL
    }
}
