package com.retropick.core.realtime

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.math.BigDecimal

enum class ReconcilerStatus {
    UNINITIALIZED,
    SNAPSHOT_LOADING,
    SYNCHRONIZED,
    DEGRADED
}

class OrderbookReconciler {
    private val _status = MutableStateFlow(ReconcilerStatus.UNINITIALIZED)
    val status: StateFlow<ReconcilerStatus> = _status.asStateFlow()

    private val _orderbookState = MutableStateFlow(
        OrderbookState(
            bids = listOf(
                OrderbookLevel(BigDecimal("0.54"), BigDecimal("1250")),
                OrderbookLevel(BigDecimal("0.53"), BigDecimal("3400")),
                OrderbookLevel(BigDecimal("0.52"), BigDecimal("5100"))
            ),
            asks = listOf(
                OrderbookLevel(BigDecimal("0.56"), BigDecimal("980")),
                OrderbookLevel(BigDecimal("0.57"), BigDecimal("2100")),
                OrderbookLevel(BigDecimal("0.58"), BigDecimal("4500"))
            ),
            streamEpoch = 1L,
            isSynchronized = true
        )
    )
    val orderbookState: StateFlow<OrderbookState> = _orderbookState.asStateFlow()

    fun processEnvelope(envelope: RealtimeEnvelope) {
        if (envelope.eventType == "resync.required" || envelope.streamEpoch != _orderbookState.value.streamEpoch) {
            _status.value = ReconcilerStatus.SNAPSHOT_LOADING
            return
        }

        if (envelope.eventType == "orderbook.snapshot") {
            _status.value = ReconcilerStatus.SYNCHRONIZED
        }
    }
}
