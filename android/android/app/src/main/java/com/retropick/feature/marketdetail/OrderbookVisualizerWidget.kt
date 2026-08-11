package com.retropick.feature.marketdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.retropick.core.realtime.OrderbookState

@Composable
fun OrderbookVisualizerWidget(
    orderbookState: OrderbookState
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "📊 Live Order Book (2% Depth)",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Surface(
                    color = if (orderbookState.isSynchronized) Color(0xFF166534) else Color(0xFF991B1B),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = if (orderbookState.isSynchronized) "SYNCHRONIZED" else "DEGRADED",
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontSize = 9.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Header labels
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Price ($)", color = Color(0xFF94A3B8), fontSize = 11.sp)
                Text("Shares Size", color = Color(0xFF94A3B8), fontSize = 11.sp)
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Asks (Red - Sell orders)
            orderbookState.asks.take(3).reversed().forEach { ask ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("$${ask.price}", color = Color(0xFFF87171), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("${ask.size}", color = Color.White, fontSize = 12.sp)
                }
            }

            Divider(color = Color(0xFF334155), modifier = Modifier.padding(vertical = 4.dp))

            // Bids (Green - Buy orders)
            orderbookState.bids.take(3).forEach { bid ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("$${bid.price}", color = Color(0xFF4ADE80), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("${bid.size}", color = Color.White, fontSize = 12.sp)
                }
            }
        }
    }
}
