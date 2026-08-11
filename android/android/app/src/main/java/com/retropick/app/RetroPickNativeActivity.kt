package com.retropick.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.lifecycleScope
import com.retropick.core.model.WalletProfile
import com.retropick.data.catalog.CatalogRepositoryImpl
import com.retropick.data.intelligence.FollowWalletStore
import com.retropick.data.intelligence.IntelligenceRepositoryImpl
import com.retropick.data.intelligence.PaperCopyEngine
import com.retropick.data.trading.TradingRepositoryImpl
import com.retropick.feature.discovery.DiscoveryScreen
import com.retropick.feature.intelligence.IntelligenceScreen
import com.retropick.feature.intelligence.WalletProfileBottomSheet
import com.retropick.feature.portfolio.PortfolioScreen
import kotlinx.coroutines.launch

class RetroPickNativeActivity : ComponentActivity() {
    private val catalogRepo = CatalogRepositoryImpl()
    private val intelligenceRepo = IntelligenceRepositoryImpl()
    private val tradingRepo = TradingRepositoryImpl()
    private val followWalletStore = FollowWalletStore()
    private val paperCopyEngine = PaperCopyEngine()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            var currentTab by remember { mutableStateOf(0) }
            var selectedWalletProfile by remember { mutableStateOf<WalletProfile?>(null) }

            val events by catalogRepo.getEventFeed().collectAsState(initial = emptyList())
            val whaleSignals by intelligenceRepo.getWhaleFeed().collectAsState(initial = emptyList())
            val leaderboard by intelligenceRepo.getSmartMoneyLeaderboard().collectAsState(initial = emptyList())
            val openOrders by tradingRepo.getOpenOrders().collectAsState(initial = emptyList())

            val paperAccount by paperCopyEngine.accountState.collectAsState()
            val paperPositions by paperCopyEngine.positionsState.collectAsState()

            Scaffold(
                bottomBar = {
                    NavigationBar(containerColor = Color(0xFF1E293B)) {
                        NavigationBarItem(
                            selected = currentTab == 0,
                            onClick = { currentTab = 0 },
                            icon = { Text("🏛️") },
                            label = { Text("Markets", color = Color.White) }
                        )
                        NavigationBarItem(
                            selected = currentTab == 1,
                            onClick = { currentTab = 1 },
                            icon = { Text("🐋") },
                            label = { Text("Intelligence", color = Color.White) }
                        )
                        NavigationBarItem(
                            selected = currentTab == 2,
                            onClick = { currentTab = 2 },
                            icon = { Text("💼") },
                            label = { Text("Portfolio", color = Color.White) }
                        )
                    }
                }
            ) { innerPadding ->
                Surface(modifier = Modifier.padding(innerPadding)) {
                    when (currentTab) {
                        0 -> DiscoveryScreen(
                            events = events,
                            onEventClick = { },
                            onSearchClick = { }
                        )
                        1 -> IntelligenceScreen(
                            whaleSignals = whaleSignals,
                            leaderboard = leaderboard,
                            paperAccount = paperAccount,
                            paperPositions = paperPositions,
                            onTraderClick = { address ->
                                lifecycleScope.launch {
                                    intelligenceRepo.getWalletProfile(address).onSuccess { profile ->
                                        selectedWalletProfile = profile.copy(isFollowing = followWalletStore.isFollowing(address))
                                    }
                                }
                            },
                            onClosePaperTrade = { tradeId ->
                                paperCopyEngine.closePaperCopyTrade(tradeId)
                            }
                        )
                        2 -> PortfolioScreen(
                            openOrders = openOrders,
                            onCancelOrder = { orderId ->
                                lifecycleScope.launch { tradingRepo.cancelOrder(orderId) }
                            },
                            onRedeemWinnings = { }
                        )
                    }

                    selectedWalletProfile?.let { profile ->
                        WalletProfileBottomSheet(
                            profile = profile,
                            onDismissRequest = { selectedWalletProfile = null },
                            onToggleFollow = { address ->
                                followWalletStore.toggleFollow(address)
                            },
                            onStartPaperCopy = { targetProfile ->
                                whaleSignals.firstOrNull()?.let { signal ->
                                    paperCopyEngine.openPaperCopyTrade(signal)
                                }
                                selectedWalletProfile = null
                            }
                        )
                    }
                }
            }
        }
    }
}
