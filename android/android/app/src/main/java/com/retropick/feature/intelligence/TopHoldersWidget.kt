package com.retropick.feature.intelligence

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
import com.retropick.core.model.WalletProfile

@Composable
fun TopHoldersWidget(
    holders: List<WalletProfile>,
    onHolderClick: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = "🥇 Top 10 Outcome Token Holders",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(10.dp))

            holders.take(10).forEachIndexed { index, holder ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "#${index + 1}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF38BDF8)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = holder.ensName ?: (holder.address.take(6) + "..." + holder.address.takeLast(4)),
                            fontSize = 13.sp,
                            color = Color.White
                        )
                    }
                    Text(
                        text = "$${holder.volume30dUsd}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF4ADE80)
                    )
                }
                if (index < holders.size - 1) {
                    Divider(color = Color(0xFF334155), thickness = 0.5.dp)
                }
            }
        }
    }
}
