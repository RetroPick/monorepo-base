package com.retropick.feature.intelligence

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
import com.retropick.core.model.WalletProfile

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WalletProfileBottomSheet(
    profile: WalletProfile,
    onDismissRequest: () -> Unit,
    onToggleFollow: (String) -> Unit,
    onStartPaperCopy: (WalletProfile) -> Unit
) {
    var isFollowing by remember { mutableStateOf(profile.isFollowing) }

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
                        text = profile.ensName ?: (profile.address.take(6) + "..." + profile.address.takeLast(4)),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = profile.address,
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )
                }

                Button(
                    onClick = {
                        isFollowing = !isFollowing
                        onToggleFollow(profile.address)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isFollowing) Color(0xFF334155) else Color(0xFF0284C7)
                    )
                ) {
                    Text(if (isFollowing) "Following" else "+ Follow", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Badges Row
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                profile.badges.forEach { badge ->
                    Surface(
                        color = Color(0xFF0369A1),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = badge.name,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontSize = 10.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Quantitive Metrics Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    modifier = Modifier.weight(1f),
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("30d Volume", fontSize = 11.sp, color = Color(0xFF94A3B8))
                        Text("$${profile.volume30dUsd}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
                Surface(
                    modifier = Modifier.weight(1f),
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Shrunk Win Rate", fontSize = 11.sp, color = Color(0xFF94A3B8))
                        if (profile.shrunkWinRate != null) {
                            Text("${(profile.shrunkWinRate * 100).toInt()}%", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4ADE80))
                        } else {
                            Text("null (n < 15)", fontSize = 13.sp, color = Color(0xFFF59E0B))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Action: Start Paper Copy Trading
            Button(
                onClick = { onStartPaperCopy(profile) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF166534)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("📝 Start Paper Copy Trading (Virtual $500)", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
