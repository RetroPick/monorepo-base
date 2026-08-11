package com.retropick.data.trading

import com.retropick.core.model.Order
import com.retropick.core.model.OrderSide
import com.retropick.core.model.OrderStatus
import com.retropick.core.model.OrderType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import java.math.BigDecimal
import java.util.UUID

data class OrderPreview(
    val marketId: String,
    val tokenId: String,
    val side: OrderSide,
    val price: BigDecimal,
    val size: BigDecimal,
    val estimatedCostUsd: BigDecimal,
    val estimatedFeeUsd: BigDecimal,
    val maxPayoutUsd: BigDecimal,
    val maxLossUsd: BigDecimal,
    val quoteExpirationTimestamp: Long
)

interface TradingRepository {
    suspend fun previewOrder(marketId: String, tokenId: String, side: OrderSide, price: BigDecimal, size: BigDecimal): Result<OrderPreview>
    suspend fun submitSignedOrder(preview: OrderPreview, signature: String): Result<Order>
    suspend fun cancelOrder(orderId: String): Result<Boolean>
    fun getOpenOrders(): Flow<List<Order>>
    fun getTradeHistory(): Flow<List<Order>>
}

class TradingRepositoryImpl : TradingRepository {
    private val activeOrders = mutableListOf<Order>()

    override suspend fun previewOrder(
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
            quoteExpirationTimestamp = System.currentTimeMillis() + 60000L // 60s quote TTL
        )
        return Result.success(preview)
    }

    override suspend fun submitSignedOrder(preview: OrderPreview, signature: String): Result<Order> {
        val order = Order(
            orderId = "ord-" + UUID.randomUUID().toString().take(8),
            clientOrderId = UUID.randomUUID().toString(),
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
        activeOrders.add(order)
        return Result.success(order)
    }

    override suspend fun cancelOrder(orderId: String): Result<Boolean> {
        val index = activeOrders.indexOfFirst { it.orderId == orderId }
        if (index != -1) {
            val existing = activeOrders[index]
            activeOrders[index] = existing.copy(status = OrderStatus.CANCELLED, updatedAt = System.currentTimeMillis())
            return Result.success(true)
        }
        return Result.failure(Exception("Order not found"))
    }

    override fun getOpenOrders(): Flow<List<Order>> = flowOf(activeOrders.filter { it.status == OrderStatus.OPEN })

    override fun getTradeHistory(): Flow<List<Order>> = flowOf(activeOrders)
}
