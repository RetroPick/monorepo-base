package com.retropick.feature.orderticket

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.retropick.core.model.Market
import com.retropick.core.model.OrderSide
import com.retropick.core.model.OutcomeToken
import kotlinx.coroutines.delay
import java.math.BigDecimal

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTicketBottomSheet(
    market: Market,
    selectedToken: OutcomeToken,
    onDismissRequest: () -> Unit,
    onSignAndSubmit: (OrderSide, BigDecimal, BigDecimal) -> Unit
) {
    var side by remember { mutableStateOf(OrderSide.BUY) }
    var priceText by remember { mutableStateOf(selectedToken.price.toString()) }
    var amountText by remember { mutableStateOf("100") }
    var ttlSeconds by remember { mutableStateOf(60) }

    val price = priceText.toBigDecimalOrNull() ?: BigDecimal.ZERO
    val amount = amountText.toBigDecimalOrNull() ?: BigDecimal.ZERO
    val estCost = price.multiply(amount)
    val fee = estCost.multiply(BigDecimal("0.001"))
    val maxLoss = estCost.add(fee)
    val maxPayout = amount

    // Quote TTL countdown timer
    LaunchedEffect(Unit) {
        while (ttlSeconds > 0) {
            delay(1000L)
            ttlSeconds--
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = Color(0xFF1E293B)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Order Ticket — ${selectedToken.outcomeLabel}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = market.question,
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8)
                    )
                }

                Surface(
                    color = if (ttlSeconds > 10) Color(0xFF1E293B) else Color(0xFF991B1B),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "TTL: ${ttlSeconds}s",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (ttlSeconds > 10) Color(0xFF38BDF8) else Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Buy / Sell Selector
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { side = OrderSide.BUY },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (side == OrderSide.BUY) Color(0xFF166534) else Color(0xFF334155)
                    )
                ) {
                    Text("BUY", fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { side = OrderSide.SELL },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (side == OrderSide.SELL) Color(0xFF991B1B) else Color(0xFF334155)
                    )
                ) {
                    Text("SELL", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Limit Price Input
            OutlinedTextField(
                value = priceText,
                onValueChange = { priceText = it },
                label = { Text("Limit Price ($)", color = Color(0xFF94A3B8)) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF38BDF8),
                    unfocusedBorderColor = Color(0xFF475569),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Shares Amount Input
            OutlinedTextField(
                value = amountText,
                onValueChange = { amountText = it },
                label = { Text("Shares Amount", color = Color(0xFF94A3B8)) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF38BDF8),
                    unfocusedBorderColor = Color(0xFF475569),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Quick Amount Add Buttons
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("50", "100", "500", "1000").forEach { quickAdd ->
                    AssistChip(
                        onClick = { amountText = quickAdd },
                        label = { Text("+$quickAdd", color = Color.White) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Summary Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                        Text("Estimated Cost", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        Text("$${estCost.toPlainString()}", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                        Text("Builder Attribution (10 bps)", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        Text("RETROPICK_BUILDER_V2", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                        Text("Max Loss / Max Payout", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        Text("$${maxLoss.toPlainString()} / $${maxPayout.toPlainString()}", color = Color(0xFF4ADE80), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Sign & Submit Button
            Button(
                onClick = { onSignAndSubmit(side, price, amount) },
                enabled = ttlSeconds > 0,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    text = if (ttlSeconds > 0) "Authorize & Sign EIP-712 Order" else "Quote Expired — Tap to Refresh",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
