package com.retropick.feature.orderticket

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.retropick.core.model.Market
import com.retropick.core.model.OrderSide
import com.retropick.core.model.OutcomeToken
import java.math.BigDecimal

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LimitOrderBottomSheet(
    market: Market,
    selectedToken: OutcomeToken,
    onDismissRequest: () -> Unit,
    onSignAndSubmit: (OrderSide, String, Int, BigDecimal, BigDecimal) -> Unit
) {
    var side by remember { mutableStateOf(OrderSide.BUY) }
    var orderType by remember { mutableStateOf("LIMIT") }
    var outcome by remember { mutableStateOf(selectedToken.outcomeLabel) }
    var limitPriceCents by remember { mutableStateOf(18) }
    var sharesCount by remember { mutableStateOf(300) }
    var expiration by remember { mutableStateOf("Never") }

    val priceDollars = BigDecimal(limitPriceCents).divide(BigDecimal(100))
    val shares = BigDecimal(sharesCount)
    val totalCost = priceDollars.multiply(shares)
    val potentialPayout = shares
    val toWin = potentialPayout.subtract(totalCost)

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = Color(0xFF121722)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // Header: Thumbnail + Question + Outcome Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF1E293B)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text("🏛️", fontSize = 20.sp)
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = market.question,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White,
                        maxLines = 1
                    )
                    Text(
                        text = outcome,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (outcome.equals("YES", true)) Color(0xFF34D399) else Color(0xFFF87171)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Buy / Sell Tabs & Order Type Dropdown
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        text = "Buy",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (side == OrderSide.BUY) Color.White else Color(0xFF94A3B8),
                        modifier = Modifier.clickable { side = OrderSide.BUY }
                    )
                    Text(
                        text = "Sell",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (side == OrderSide.SELL) Color.White else Color(0xFF94A3B8),
                        modifier = Modifier.clickable { side = OrderSide.SELL }
                    )
                }

                Surface(
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "Limit ˅",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        fontSize = 12.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Outcome Buttons (Yes 15¢ vs No 86¢)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { outcome = "YES" },
                    color = if (outcome.equals("YES", true)) Color(0xFF059669) else Color(0xFF1E293B),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Yes", color = Color.White, fontWeight = FontWeight.Bold)
                        Text("15¢", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { outcome = "NO" },
                    color = if (outcome.equals("NO", true)) Color(0xFFDC2626) else Color(0xFF1E293B),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("No", color = Color.White, fontWeight = FontWeight.Bold)
                        Text("86¢", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Limit Price Stepper (- 18¢ +)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Limit price", color = Color.White, fontSize = 14.sp)
                Surface(
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { if (limitPriceCents > 1) limitPriceCents-- }) {
                            Text("-", color = Color(0xFF94A3B8), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            text = "${limitPriceCents}¢",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 12.dp)
                        )
                        IconButton(onClick = { if (limitPriceCents < 99) limitPriceCents++ }) {
                            Text("+", color = Color(0xFF94A3B8), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Shares Input & Chips (-100, -10, +10, +20, +100)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Shares", color = Color.White, fontSize = 14.sp)
                Surface(
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(
                        text = "$sharesCount",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 10.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Quick increment chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf(-100, -10, 10, 20, 100).forEach { delta ->
                    AssistChip(
                        onClick = { sharesCount = maxOf(1, sharesCount + delta) },
                        label = { Text(if (delta > 0) "+$delta" else "$delta", color = Color.White, fontSize = 11.sp) },
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Liquidity Matching Indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                Surface(
                    color = Color(0xFF064E3B),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = "ⓘ ${sharesCount}.00 matching",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        color = Color(0xFF34D399),
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Financial Summary
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                        Text("Total", color = Color(0xFF94A3B8), fontSize = 14.sp)
                        Text("$${totalCost.setScale(2, java.math.RoundingMode.HALF_UP)}", color = Color(0xFF38BDF8), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                        Text("To win ⓘ", color = Color(0xFF94A3B8), fontSize = 14.sp)
                        Text("💵 $${toWin.setScale(2, java.math.RoundingMode.HALF_UP)}", color = Color(0xFF34D399), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Main Trade Button
            Button(
                onClick = { onSignAndSubmit(side, outcome, limitPriceCents, totalCost, toWin) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Trade", fontSize = 17.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
