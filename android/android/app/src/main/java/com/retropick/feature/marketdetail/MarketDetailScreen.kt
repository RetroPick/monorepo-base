package com.retropick.feature.marketdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Share
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
import com.retropick.feature.orderticket.LimitOrderBottomSheet

@Composable
fun MarketDetailScreen(
    market: Market,
    onBack: () -> Unit,
    onExecuteTrade: (OrderSide, String, Int, java.math.BigDecimal, java.math.BigDecimal) -> Unit
) {
    var showLimitModal by remember { mutableStateOf(false) }
    var selectedToken by remember { mutableStateOf(market.tokens.firstOrNull() ?: OutcomeToken("YES", "0x1", "Yes", market.yes)) }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF090D16))) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Header Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                Text("Market Detail", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Row {
                    IconButton(onClick = {}) {
                        Icon(Icons.Default.Share, contentDescription = "Share", tint = Color(0xFF94A3B8))
                    }
                    IconButton(onClick = {}) {
                        Icon(Icons.Default.Notifications, contentDescription = "Alert", tint = Color(0xFF94A3B8))
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Question Title & Status
            Text(
                text = market.question,
                color = Color.White,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                lineHeight = 24.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Surface(
                color = Color(0xFF064E3B),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = "Live • Freshness Verified",
                    color = Color(0xFF34D399),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Price Chart Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF121722),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${market.yes}%", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black)
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            color = Color(0xFF064E3B),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text("↑ +4.2% (24H)", color = Color(0xFF34D399), fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(6.dp))
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    // Mock Chart Canvas
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .background(Color(0xFF0F172A), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("📈 Polymarket Precision Chart Data", color = Color(0xFF64748B), fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Clean 2-Button UP / DOWN CTA Section
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF121722),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "PLACE TRADE",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // 🟢 UP Button
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    selectedToken = OutcomeToken("YES", "0x1", "Yes", market.yes)
                                    showLimitModal = true
                                },
                            color = Color(0xFF064E3B).copy(alpha = 0.5f),
                            shape = RoundedCornerShape(14.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981))
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("↑", color = Color(0xFF34D399), fontWeight = FontWeight.Black, fontSize = 16.sp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Up", color = Color(0xFF34D399), fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                                }
                                Surface(
                                    color = Color(0xFF064E3B),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text("${market.yes}¢", color = Color(0xFF34D399), fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                }
                            }
                        }

                        // 🔴 DOWN Button
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    selectedToken = OutcomeToken("NO", "0x2", "No", 100 - market.yes)
                                    showLimitModal = true
                                },
                            color = Color(0xFF7F1D1D).copy(alpha = 0.5f),
                            shape = RoundedCornerShape(14.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444))
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("↓", color = Color(0xFFF87171), fontWeight = FontWeight.Black, fontSize = 16.sp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Down", color = Color(0xFFF87171), fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                                }
                                Surface(
                                    color = Color(0xFF7F1D1D),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text("${100 - market.yes}¢", color = Color(0xFFF87171), fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Orderbook Visualizer
            OrderbookVisualizerWidget(marketId = market.id)
        }

        // Limit Order Bottom Sheet Modal
        if (showLimitModal) {
            LimitOrderBottomSheet(
                market = market,
                selectedToken = selectedToken,
                onDismissRequest = { showLimitModal = false },
                onSignAndSubmit = { side, outcome, priceCents, totalCost, toWin ->
                    onExecuteTrade(side, outcome, priceCents, totalCost, toWin)
                    showLimitModal = false
                }
            )
        }
    }
}
