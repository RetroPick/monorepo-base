'use client'

import { useState, useEffect } from 'react'
import {
  MARKETS,
  OPEN_POSITIONS,
  RECENT_ACTIVITY,
  type Market,
} from '@/lib/retropick-data'
import { TopBar } from './top-bar'
import { BottomNav, type Tab } from './bottom-nav'
import { DrawerMenu } from './drawer-menu'
import { TradeSheet } from './trade-sheet'
import { AlertsDrawer, type NotificationLog } from './alerts-drawer'
import { AddFundsModal } from './add-funds-modal'
import { ConnectModal } from './connect-modal'
import { MarketsScreen } from './screens/markets-screen'
import { MarketDetail } from './screens/market-detail'
import { ExploreScreen } from './screens/explore-screen'
import { PortfolioScreen } from './screens/portfolio-screen'
import { IntelligenceScreen } from './screens/intelligence-screen'
import { SplashScreen } from './screens/splash-screen'

import { fetchLivePolymarketMarkets, classifyMarketCategory, extractSubTags } from '@/lib/polymarket-service'
import { StorageService } from '@/lib/storage-service'

const TITLES: Record<Tab, string> = {
  explore: 'Explore',
  markets: 'Markets',
  intelligence: 'Intelligence',
  portfolio: 'Portfolio',
}

export function AppShell() {
  const [showSplash, setShowSplash] = useState(false)
  const [tab, setTab] = useState<Tab>('explore')
  const [detail, setDetail] = useState<Market | null>(null)
  const [categoryDetail, setCategoryDetail] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false)
    }, 1800)
    return () => clearTimeout(splashTimer)
  }, [])
  // State initialized with Local Storage Persistence (STATE_DATA_OFFLINE_AND_REALTIME.md)
  const [balance, setBalance] = useState<number>(() => StorageService.loadBalance(1240.50))
  const [trade, setTrade] = useState<{ market: Market; side: 'yes' | 'no'; optionLabel?: string; optionPrice?: number } | null>(null)

  // Auth & Wallet States
  const [authenticated, setAuthenticated] = useState<boolean>(() => StorageService.loadAuth().authenticated)
  const [walletConnected, setWalletConnected] = useState<boolean>(() => StorageService.loadAuth().walletConnected)
  const [walletAddress, setWalletAddress] = useState<string>(() => StorageService.loadAuth().address)
  const [walletProvider, setWalletProvider] = useState<string>(() => StorageService.loadAuth().provider)
  const [userEmail, setUserEmail] = useState<string>(() => StorageService.loadAuth().email)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showAddFundsModal, setShowAddFundsModal] = useState(false)
  
  // System Resilience, Network Status & Governance States
  const [isOffline, setIsOffline] = useState<boolean>(false)
  const [readOnlyMode, setReadOnlyMode] = useState<boolean>(false)
  const [userEligible, setUserEligible] = useState<boolean>(true)

  // Custom Dynamic State loaded from local storage (auto-reclassified for category & sub-tags accuracy)
  const [markets, setMarkets] = useState<Market[]>(() => {
    const loaded = StorageService.loadMarketsCache(MARKETS)
    return loaded.map((m) => {
      const cat = classifyMarketCategory(m.question)
      return {
        ...m,
        category: cat,
        tags: extractSubTags(m.question, cat),
      }
    })
  })
  const [positions, setPositions] = useState<any[]>(() => StorageService.loadPositions(OPEN_POSITIONS))
  const [activity, setActivity] = useState<any[]>(() => StorageService.loadActivity(RECENT_ACTIVITY))
  const [alerts, setAlerts] = useState<Array<{ id: string; marketId: string; question: string; targetPct: number }>>([])
  
  // Notifications State loaded from storage
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => StorageService.loadNotifications([
    {
      id: 'notif-1',
      title: 'Odds Movement',
      body: 'Bitcoin $200K odds surged +5% in the last hour.',
      time: '10m ago',
      read: false,
      type: 'info',
    },
    {
      id: 'notif-2',
      title: 'Deposit Confirmed',
      body: 'Received $500.00 USDC deposit via Base Network.',
      time: '1h ago',
      read: false,
      type: 'info',
    },
  ]))
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false)

  // Auto-persist state changes to StorageService
  useEffect(() => { StorageService.saveBalance(balance) }, [balance])
  useEffect(() => { StorageService.savePositions(positions) }, [positions])
  useEffect(() => { StorageService.saveActivity(activity) }, [activity])
  useEffect(() => { StorageService.saveNotifications(notifications) }, [notifications])
  useEffect(() => { StorageService.saveMarketsCache(markets) }, [markets])
  useEffect(() => { 
    StorageService.saveAuth({ authenticated, walletConnected, address: walletAddress, provider: walletProvider, email: userEmail }) 
  }, [authenticated, walletConnected, walletAddress, walletProvider, userEmail])

  // Dynamically update document theme while keeping top status bar fixed & visible for Android
  useEffect(() => {
    const root = document.documentElement
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(metaThemeColor)
    }

    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Keep top Android status bar FIXED to solid dark navy (#0E131F) with white icons
    metaThemeColor.setAttribute('content', '#0E131F')
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.StatusBar) {
      try {
        ;(window as any).Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: false })
        ;(window as any).Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#0E131F' })
        ;(window as any).Capacitor.Plugins.StatusBar.setStyle({ style: 'DARK' })
      } catch (_) {}
    }
  }, [dark])

  // Online / Offline Network Listener (STATE_DATA_OFFLINE_AND_REALTIME.md)
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setReadOnlyMode(false)
    }
    const handleOffline = () => {
      setIsOffline(true)
      setReadOnlyMode(true)
    }

    if (typeof window !== 'undefined') {
      if (!navigator.onLine) {
        setIsOffline(true)
        setReadOnlyMode(true)
      }
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // 1. Fetch live Polymarket API feed on mount & parse Deep Links (NAVIGATION_AND_DEEP_LINKS.md)
  useEffect(() => {
    async function loadLiveMarkets() {
      try {
        const live = await fetchLivePolymarketMarkets()
        if (live && live.length > 0) {
          setMarkets((prev) => {
            const liveIds = new Set(live.map((m) => m.id))
            const remainingLocal = MARKETS.filter((m) => !liveIds.has(m.id))
            const combined = [...live, ...remainingLocal]
            return combined.map((m) => {
              const cat = classifyMarketCategory(m.question, m.category)
              return {
                ...m,
                category: cat,
                tags: extractSubTags(m.question, cat),
              }
            })
          })
        }
      } catch (err) {
        console.log('Using static fallback markets:', err)
      }
    }
    loadLiveMarkets()

    // URL Deep Linking Parser
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const marketParam = params.get('market')
      const tabParam = params.get('tab') as Tab | null

      if (tabParam && ['explore', 'markets', 'portfolio'].includes(tabParam)) {
        setTab(tabParam)
      }
      if (marketParam) {
        const matched = markets.find(m => m.id === marketParam || m.id.toLowerCase().includes(marketParam.toLowerCase()))
        if (matched) {
          setDetail(matched)
        }
      }
    }
  }, [])

  // 2. Real-time Live Price Updates & Alerts Monitoring Engine (PolymarketAlerts)
  useEffect(() => {
    const liveInterval = setInterval(() => {
      setMarkets((prevMarkets) => {
        return prevMarkets.map((m) => {
          if (Math.random() > 0.6) {
            const shift = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1)
            const newYes = Math.max(1, Math.min(99, m.yes + shift))
            const newTrend = shift >= 0 ? 'up' : 'down'
            const newChart = [...(m.chart || []).slice(1), newYes]

            // Check alerts engine
            alerts.forEach((alert) => {
              if (alert.marketId === m.id && newYes >= alert.targetPct) {
                setNotifications((prevNotifs) => {
                  const exists = prevNotifs.some(n => n.title === '🔔 Price Alert Triggered' && n.body.includes(m.question))
                  if (!exists) {
                    return [
                      {
                        id: `alert-hit-${Date.now()}`,
                        title: '🔔 Price Alert Triggered',
                        body: `Target hit! ${m.question} reached ${newYes}% probability!`,
                        time: 'Just now',
                        read: false,
                        type: 'alert',
                      },
                      ...prevNotifs,
                    ]
                  }
                  return prevNotifs
                })
              }
            })

            return {
              ...m,
              yes: newYes,
              trend: newTrend,
              chart: newChart,
            }
          }
          return m
        })
      })
    }, 5000)

    return () => clearInterval(liveInterval)
  }, [alerts])

  // Toggle 'dark' and 'light' class on document.documentElement for Dark/Light mode theme switching
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
  }, [dark])

  const openMarket = (m: Market) => {
    setDetail(m)
    setCategoryDetail(null)
  }

  const handleDisconnect = () => {
    setAuthenticated(false)
    setWalletConnected(false)
    setWalletAddress('')
    setWalletProvider('')
    setUserEmail('')
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('retropick_following_wallets')
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleProvisionWallet = (type: 'embedded' | 'external', provider?: string) => {
    setAuthenticated(true)
    setWalletConnected(true)
    setWalletAddress('0x23Cb836e35ed8213ad280a6D1F1C1149e830E300')
    setWalletProvider(provider || 'google')
    if (!userEmail) {
      setUserEmail('trader@retropick.app')
    }
  }

  const executeTrade = (
    marketId: string,
    question: string,
    outcomeLabel: string,
    percentage: number,
    amount: number
  ) => {
    setBalance((prev) => Math.max(0, prev - amount))
    
    // Shift yes percentage dynamically based on trade size & direction
    const isUp = outcomeLabel.toLowerCase().includes('up') || outcomeLabel.toLowerCase().includes('yes')
    const shift = Math.max(1, Math.min(4, Math.round(amount / 25)))
    const delta = isUp ? shift : -shift

    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id === marketId) {
          const newYes = Math.max(1, Math.min(99, m.yes + delta))
          const newChart = m.chart && m.chart.length > 0 ? [...m.chart.slice(1), newYes] : [newYes]
          return { ...m, yes: newYes, chart: newChart, trend: newYes >= 50 ? 'up' : 'down' }
        }
        return m
      })
    )

    setDetail((prev) => {
      if (prev && prev.id === marketId) {
        const newYes = Math.max(1, Math.min(99, prev.yes + delta))
        const newChart = prev.chart && prev.chart.length > 0 ? [...prev.chart.slice(1), newYes] : [newYes]
        return { ...prev, yes: newYes, chart: newChart, trend: newYes >= 50 ? 'up' : 'down' }
      }
      return prev
    })

    // Add to activity
    const newAct = {
      label: `Bought '${outcomeLabel}' for ${question}`,
      time: 'Just now',
      amount: `-$${amount.toFixed(2)}`,
      up: false,
    }
    setActivity((prev) => [newAct, ...prev])

    // Add or update positions
    setPositions((prev) => {
      const existing = prev.find((p) => p.question === question && p.side === outcomeLabel)
      if (existing) {
        const currentVal = parseFloat(existing.value.replace(/[^0-9.]/g, '')) || 0
        return prev.map((p) =>
          p.question === question && p.side === outcomeLabel
            ? { ...p, value: `$${(currentVal + amount).toFixed(2)}` }
            : p
        )
      } else {
        return [
          {
            id: marketId,
            question,
            side: outcomeLabel,
            prob: percentage,
            value: `$${amount.toFixed(2)}`,
            pnl: '+$0.00 (0%)',
            meta: 'Position Open',
          },
          ...prev,
        ]
      }
    })

    // Log notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Order Executed',
        body: `Purchased $${amount.toFixed(2)} of "${outcomeLabel}" in ${question}`,
        time: 'Just now',
        read: false,
        type: 'info',
      },
      ...prev,
    ])
  }

  const handleSetAlert = (marketId: string, question: string, targetPct: number) => {
    setAlerts((prev) => [...prev, { id: `alert-${Date.now()}`, marketId, question, targetPct }])
    setNotifications((prev) => [
      {
        id: `notif-alert-${Date.now()}`,
        title: 'Alert Created',
        body: `Notification target set for ${question} at ${targetPct}% probability.`,
        time: 'Just now',
        read: false,
        type: 'alert',
      },
      ...prev,
    ])
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#05070a] p-0 sm:p-6">
      {/* Android device frame */}
      <div className="relative h-screen w-full max-w-[420px] overflow-hidden bg-background sm:h-[860px] sm:rounded-[38px] sm:border-[10px] sm:border-[#05070a] sm:shadow-2xl">
        <div className={`relative h-full w-full ${dark ? 'dark' : 'light'}`}>
          {/* Render Original SplashScreen Component */}
          {showSplash && (
            <div className="absolute inset-0 z-[100]">
              <SplashScreen />
            </div>
          )}

          <div className="relative flex h-full flex-col bg-background text-foreground">
            <div className="flex h-full flex-col bg-background">
              {/* Main content area */}
              <div className="flex-1 min-h-0 relative flex flex-col">
                <TopBar 
                  title={detail ? 'Market Detail' : TITLES[tab]} 
                  onMenu={() => setDrawer(true)} 
                  activeTab={tab}
                  onTabChange={(t) => {
                    setTab(t)
                    setDetail(null)
                    setCategoryDetail(null)
                  }}
                  authenticated={authenticated}
                  walletConnected={walletConnected}
                  walletAddress={walletAddress}
                  walletProvider={walletProvider}
                  userEmail={userEmail}
                  onConnect={() => setShowConnectModal(true)}
                  onDisconnect={handleDisconnect}
                  onProvisionWallet={handleProvisionWallet}
                  onNotifications={() => {
                    setShowAlertsDrawer(true)
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                  }}
                  hasUnread={notifications.some((n) => !n.read)}
                />

                {/* Offline / Read-Only Degradation System Banner (STATE_DATA_OFFLINE_AND_REALTIME.md) */}
                {(isOffline || readOnlyMode) && (
                  <div className="bg-amber-500/15 border-b border-amber-500/30 px-3.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      {isOffline
                        ? 'Offline Mode: Displaying cached data. Trading paused.'
                        : 'Read-Only Mode: Upstream venue degraded. Trading paused.'}
                    </span>
                    {!isOffline && (
                      <button 
                        onClick={() => setReadOnlyMode(false)}
                        className="underline text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                )}

                <main className="no-scrollbar flex-1 overflow-y-auto">
                  {detail ? (
                    <MarketDetail
                      market={detail}
                      balance={balance}
                      positions={positions}
                      sourceCategory={tab === 'explore' ? 'Trending' : (detail.category || 'Markets')}
                      onBack={() => setDetail(null)}
                      onTrade={(side) => setTrade({ market: detail, side })}
                      onExecuteTrade={(outcomeLabel, percentage, amount) => {
                        executeTrade(detail.id, detail.question, outcomeLabel, percentage, amount)
                      }}
                      onSetAlert={handleSetAlert}
                      onSelectMarket={(m) => setDetail(m)}
                    />
                  ) : (
                    <>
                      {tab === 'explore' && (
                        <ExploreScreen 
                          onOpenMarket={openMarket} 
                          markets={markets} 
                          onSelectCategory={(cat) => {
                            setTab('markets')
                            setCategoryDetail(cat)
                            setDetail(null)
                          }}
                        />
                      )}
                      {tab === 'markets' && (
                        <MarketsScreen 
                          onOpenMarket={openMarket} 
                          markets={markets} 
                          selectedCategory={categoryDetail}
                          onClearCategory={() => setCategoryDetail(null)}
                        />
                      )}
                      {tab === 'intelligence' && (
                        <IntelligenceScreen 
                          onSelectMarket={openMarket}
                        />
                      )}
                      {tab === 'portfolio' && (
                        <PortfolioScreen 
                          balance={balance} 
                          positions={positions} 
                          activity={activity} 
                          authenticated={authenticated}
                          walletConnected={walletConnected}
                          onConnect={() => setShowConnectModal(true)}
                          onOpenAddFunds={() => setShowAddFundsModal(true)}
                          onProvisionWallet={handleProvisionWallet}
                          walletAddress={walletAddress}
                        />
                      )}
                    </>
                  )}
                </main>
              </div>

              {/* 3-Tab Bottom Navigation matching Polymarket app */}
              {!showSplash && (
                <BottomNav 
                  active={tab} 
                  onChange={(t) => {
                    setTab(t)
                    setDetail(null)
                    setCategoryDetail(null)
                    setTrade(null)
                    setShowConnectModal(false)
                    setShowAddFundsModal(false)
                    setShowAlertsDrawer(false)
                    setDrawer(false)
                  }} 
                />
              )}
            </div>

            {/* Overlays */}
            <DrawerMenu
              open={drawer}
              onClose={() => setDrawer(false)}
              dark={dark}
              markets={markets}
              onToggleTheme={() => setDark((d) => !d)}
              onSelectExplore={() => {
                setTab('explore')
                setCategoryDetail(null)
                setDetail(null)
                setDrawer(false)
              }}
              onSelectCategory={(catName) => {
                setTab('markets')
                setCategoryDetail(catName)
                setDetail(null)
                setDrawer(false)
              }}
              onSubCategoryClick={(value) => {
                setTab('markets')
                setCategoryDetail(value)
                setDetail(null)
                setDrawer(false)
              }}
              onNavigatePortfolio={() => {
                setTab('portfolio')
                setDetail(null)
                setDrawer(false)
              }}
            />
            {trade && (
              <TradeSheet
                market={trade.market}
                side={trade.side}
                balance={balance}
                readOnly={readOnlyMode}
                eligible={userEligible}
                onClose={() => setTrade(null)}
                onExecuteTrade={(outcomeLabel, percentage, amount) => {
                  executeTrade(trade.market.id, trade.market.question, outcomeLabel, percentage, amount)
                  setTrade(null)
                }}
              />
            )}
            <AlertsDrawer
              open={showAlertsDrawer}
              onClose={() => setShowAlertsDrawer(false)}
              notifications={notifications}
              onClear={() => setNotifications([])}
              onDeleteNotif={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
            />

            {/* Login / Auth Connect Modal Overlay */}
            <ConnectModal
              open={showConnectModal}
              onClose={() => setShowConnectModal(false)}
              onProvisionWallet={(type, provider, email) => {
                handleProvisionWallet(type, provider)
                if (email) setUserEmail(email)
                setShowConnectModal(false)
              }}
            />

            {/* Add Funds Modal Overlay */}
            <AddFundsModal
              open={showAddFundsModal}
              onClose={() => setShowAddFundsModal(false)}
              balance={balance}
              walletAddress={walletAddress}
              onAddBalance={(amt, desc) => {
                setBalance((prev) => prev + amt)
                setActivity((prev) => [
                  {
                    label: desc || 'Deposited USDC',
                    time: 'Just now',
                    amount: `+$${amt.toFixed(2)}`,
                    up: true,
                  },
                  ...prev,
                ])
                setNotifications((prev) => [
                  {
                    id: `notif-dep-${Date.now()}`,
                    title: 'Deposit Successful',
                    body: `Added $${amt.toFixed(2)} USDC to wallet balance.`,
                    time: 'Just now',
                    read: false,
                    type: 'info',
                  },
                  ...prev,
                ])
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
