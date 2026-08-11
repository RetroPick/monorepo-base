package com.retropick.feature.intelligence

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.retropick.core.model.PaperCopyAccount
import com.retropick.core.model.PaperCopyPosition

@Composable
fun PaperCopyDashboard(
    account: PaperCopyAccount,
    positions: List<PaperCopyPosition>,
    onCloseTrade: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
    ) {
        // Account Balance Banner
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF166534)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Virtual Paper Copy Balance", color = Color(0xFF86EFAC), fontSize = 12.sp)
                Text("$${account.virtualBalanceUsd}", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Allocated Stake: $${account.allocatedCopyUsd}", color = Color.White, fontSize = 12.sp)
                    Text("Total PnL: +$${account.totalPaperPnLUsd}", color = Color(0xFF4ADE80), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text("Active Paper Copy Positions (${positions.size})", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)

        Spacer(modifier = Modifier.height(10.dp))

        if (positions.isEmpty()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF1E293B),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "No active paper copy positions. Follow a trader to start paper copying!",
                    modifier = Modifier.padding(20.dp),
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp
                )
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(positions) { pos ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Copying: ${pos.targetTraderName}", color = Color(0xFF38BDF8), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Text("+${pos.returnPercentage}% PnL", color = Color(0xFF4ADE80), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                            Text(pos.marketQuestion, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Stake: $${pos.virtualStakeUsd} (${pos.outcomeLabel})", color = Color(0xFF94A3B8), fontSize = 12.sp)
                                TextButton(onClick = { onCloseTrade(pos.paperTradeId) }) {
                                    Text("Close Position", color = Color(0xFFEF4444), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
