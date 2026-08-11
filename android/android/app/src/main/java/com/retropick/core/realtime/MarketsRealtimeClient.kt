package com.retropick.core.realtime

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.math.BigDecimal

data class RealtimeEnvelope(
    val eventType: String, // orderbook.snapshot, orderbook.delta, trade.executed, resync.required
    val marketId: String,
    val tokenId: String,
    val streamEpoch: Long,
    val deliveryCounter: Long,
    val payload: String
)

data class OrderbookLevel(
    val price: BigDecimal,
    val size: BigDecimal
)

data class OrderbookState(
    val bids: List<OrderbookLevel>,
    val asks: List<OrderbookLevel>,
    val streamEpoch: Long,
    val isSynchronized: Boolean
)

class MarketsRealtimeClient(
    private val wsUrl: String = "wss://api.retropick.io/api/v1/markets/realtime"
) {
    private val _realtimeFlow = MutableSharedFlow<RealtimeEnvelope>()
    val realtimeFlow: SharedFlow<RealtimeEnvelope> = _realtimeFlow.asSharedFlow()

    private var currentEpoch: Long = 1L
    private var counter: Long = 0L

    suspend fun subscribe(marketId: String, tokenId: String) {
        counter++
        val snapshotEnvelope = RealtimeEnvelope(
            eventType = "orderbook.snapshot",
            marketId = marketId,
            tokenId = tokenId,
            streamEpoch = currentEpoch,
            deliveryCounter = counter,
            payload = "{\"bids\": [{\"price\": \"0.54\", \"size\": \"1000\"}], \"asks\": [{\"price\": \"0.56\", \"size\": \"850\"}]}"
        )
        _realtimeFlow.emit(snapshotEnvelope)
    }

    suspend fun unsubscribe(marketId: String, tokenId: String) {
        // Emit unsubscribe
    }
}
