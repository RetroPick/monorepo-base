package com.retropick.feature.portfolio

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.retropick.core.model.Order

@Composable
fun PortfolioScreen(
    openOrders: List<Order>,
    onCancelOrder: (String) -> Unit,
    onRedeemWinnings: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        Text(
            text = "Portfolio & Orders",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Manage active limit orders & claim winnings",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8)
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Claim Winnings Banner
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF166534)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Claimable PnL Winnings", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text("Resolved market rewards ready", color = Color(0xFF86EFAC), fontSize = 12.sp)
                }
                Button(
                    onClick = onRedeemWinnings,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                ) {
                    Text("Claim All", fontWeight = FontWeight.Bold, color = Color.Black)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("Active Open Orders", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)

        Spacer(modifier = Modifier.height(10.dp))

        if (openOrders.isEmpty()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF1E293B),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "No open limit orders.",
                    modifier = Modifier.padding(24.dp),
                    color = Color(0xFF94A3B8),
                    fontSize = 14.sp
                )
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(openOrders) { order ->
                    OpenOrderCard(order = order, onCancelOrder = onCancelOrder)
                }
            }
        }
    }
}

@Composable
fun OpenOrderCard(order: Order, onCancelOrder: (String) -> Unit) {
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
                    text = "${order.side.name} ${order.originalSize} shares @ $${order.price}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (order.side.name == "BUY") Color(0xFF4ADE80) else Color(0xFFF87171)
                )
                TextButton(onClick = { onCancelOrder(order.orderId) }) {
                    Text("Cancel", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                }
            }
            Text(
                text = "Status: ${order.status.name} • Market: ${order.marketId}",
                fontSize = 12.sp,
                color = Color(0xFF94A3B8)
            )
        }
    }
}
