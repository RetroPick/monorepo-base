package com.retropick.feature.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import com.retropick.core.model.Event
import com.retropick.core.model.MarketCategory

@Composable
fun DiscoveryScreen(
    events: List<Event>,
    onEventClick: (Event) -> Unit,
    onSearchClick: () -> Unit
) {
    var selectedCategory by remember { mutableStateOf<MarketCategory?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "RetroPick Markets",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Polymarket Execution Engine",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }
            Surface(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onSearchClick() },
                color = Color(0xFF1E293B)
            ) {
                Text(
                    text = "🔍 Search",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    color = Color.White,
                    fontSize = 14.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Categories Filter Chips
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                FilterChip(
                    selected = selectedCategory == null,
                    onClick = { selectedCategory = null },
                    label = { Text("All Markets", color = Color.White) }
                )
            }
            items(MarketCategory.values()) { category ->
                FilterChip(
                    selected = selectedCategory == category,
                    onClick = { selectedCategory = category },
                    label = { Text(category.name, color = Color.White) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Event List
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(events) { event ->
                EventCard(event = event, onClick = { onEventClick(event) })
            }
        }
    }
}

@Composable
fun EventCard(event: Event, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Surface(
                    color = Color(0xFF334155),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = event.category.name,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 10.sp,
                        color = Color(0xFF38BDF8),
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = "Vol: " + event.activeVolume24h,
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = event.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Show first market outcomes preview
            event.markets.firstOrNull()?.let { market ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    market.tokens.forEach { token ->
                        val isYes = token.outcomeLabel.equals("YES", ignoreCase = true)
                        val btnColor = if (isYes) Color(0xFF166534) else Color(0xFF991B1B)
                        val textColor = if (isYes) Color(0xFF4ADE80) else Color(0xFFF87171)

                        Surface(
                            modifier = Modifier.weight(1f),
                            color = btnColor,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(token.outcomeLabel, color = Color.White, fontWeight = FontWeight.Bold)
                                Text("${(token.price.toDouble() * 100).toInt()}%", color = textColor, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
