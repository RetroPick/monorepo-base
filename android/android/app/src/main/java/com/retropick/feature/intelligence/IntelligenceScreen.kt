package com.retropick.feature.intelligence

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.retropick.core.model.PaperCopyAccount
import com.retropick.core.model.PaperCopyPosition
import com.retropick.core.model.WalletProfile
import com.retropick.core.model.WhaleSignal

@Composable
fun IntelligenceScreen(
    whaleSignals: List<WhaleSignal>,
    leaderboard: List<WalletProfile>,
    paperAccount: PaperCopyAccount = PaperCopyAccount(),
    paperPositions: List<PaperCopyPosition> = emptyList(),
    onTraderClick: (String) -> Unit,
    onClosePaperTrade: (String) -> Unit = {}
) {
    var selectedTab by remember { mutableStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        Text(
            text = "Smart Money Intelligence",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Live Whale Feed, Wallet Analytics & Paper Copy",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8)
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Search Bar for Wallets
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search EVM address or ENS (SatoshiWhale.eth)", color = Color(0xFF94A3B8), fontSize = 12.sp) },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF38BDF8),
                unfocusedBorderColor = Color(0xFF334155),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White
            )
        )

        Spacer(modifier = Modifier.height(12.dp))

        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1E293B),
            contentColor = Color(0xFF38BDF8)
        ) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                Text("🐋 Feed", modifier = Modifier.padding(10.dp), color = Color.White, fontSize = 12.sp)
            }
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                Text("🏆 Ranking", modifier = Modifier.padding(10.dp), color = Color.White, fontSize = 12.sp)
            }
            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }) {
                Text("📝 Paper Copy", modifier = Modifier.padding(10.dp), color = Color.White, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        when (selectedTab) {
            0 -> {
                val filteredSignals = if (searchQuery.isBlank()) whaleSignals else whaleSignals.filter {
                    it.traderAddress.contains(searchQuery, ignoreCase = true) ||
                    (it.traderPseudonym != null && it.traderPseudonym.contains(searchQuery, ignoreCase = true))
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(filteredSignals) { signal ->
                        WhaleSignalCard(signal = signal, onTraderClick = onTraderClick)
                    }
                }
            }
            1 -> {
                val filteredLeaderboard = if (searchQuery.isBlank()) leaderboard else leaderboard.filter {
                    it.address.contains(searchQuery, ignoreCase = true) ||
                    (it.ensName != null && it.ensName.contains(searchQuery, ignoreCase = true))
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(filteredLeaderboard) { profile ->
                        LeaderboardCard(profile = profile, onTraderClick = onTraderClick)
                    }
                }
            }
            2 -> {
                PaperCopyDashboard(
                    account = paperAccount,
                    positions = paperPositions,
                    onCloseTrade = onClosePaperTrade
                )
            }
        }
    }
}

@Composable
fun WhaleSignalCard(signal: WhaleSignal, onTraderClick: (String) -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onTraderClick(signal.traderAddress) },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = Color(0xFF0284C7),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "WhaleScore ${signal.whaleScore}",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                Text(
                    text = "$${signal.notionalUsd}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF4ADE80)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = signal.marketQuestion,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Trader: ${signal.traderPseudonym ?: signal.traderAddress.take(8) + "..."}",
                    fontSize = 12.sp,
                    color = Color(0xFF38BDF8)
                )
                Text(
                    text = "Outcome: ${signal.outcomeLabel}",
                    fontSize = 12.sp,
                    color = Color(0xFFE2E8F0)
                )
            }
        }
    }
}

@Composable
fun LeaderboardCard(profile: WalletProfile, onTraderClick: (String) -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onTraderClick(profile.address) },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = profile.ensName ?: (profile.address.take(6) + "..." + profile.address.takeLast(4)),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "30d Vol: $${profile.volume30dUsd} • ${profile.tradesCount30d} trades",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }

            profile.shrunkWinRate?.let { winRate ->
                Surface(
                    color = Color(0xFF166534),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "Win: ${(winRate * 100).toInt()}%",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF4ADE80)
                    )
                }
            }
        }
    }
}
