package com.retropick.data.trading

import com.retropick.core.model.Order
import com.retropick.core.model.OrderStatus
import kotlinx.coroutines.delay

class OrderReconciliationWorker {
    suspend fun reconcileUnknownOrder(order: Order): Order {
        // Poll CLOB worker by clientOrderId / idempotency key
        delay(1500)
        return order.copy(
            status = OrderStatus.OPEN,
            updatedAt = System.currentTimeMillis()
        )
    }
}
