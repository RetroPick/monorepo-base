'use client'

import { useEffect, useState } from 'react'
import { type Market, OPEN_POSITIONS, RECENT_ACTIVITY, MARKETS } from '@/lib/retropick-data'
import { fetchLivePolymarketMarkets } from '@/lib/polymarket-service'
import { TopBar } from './top-bar'
import { BottomNav, type Tab } from './bottom-nav'
import { DrawerMenu } from './drawer-menu'
import { TradeSheet } from './trade-sheet'
import { SplashScreen } from './screens/splash-screen'
import { ExploreScreen } from './screens/explore-screen'
import { MarketsScreen } from './screens/markets-screen'
import { MarketDetail } from './screens/market-detail'
import { CategoryDetailScreen } from './screens/category-detail'
import { PortfolioScreen } from './screens/portfolio-screen'
import { AlertsDrawer, type NotificationLog } from './alerts-drawer'
import { X } from 'lucide-react'

const TITLES: Record<Tab, string> = {
  explore: 'Explore',
  markets: 'Markets',
  portfolio: 'Portfolio',
}

export type Position = {
  id: string
  question: string
  side: string
  prob: number
  value: string
  pnl: string
  up: boolean
  meta: string
}

export type Activity = {
  label: string
  time: string
  amount: string
  up: boolean
}

const WALLET_ADDRESSES = [
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F8bf6A479f320ead0075851d8510D27210a5b4',
  '0x2912D8A41E152864C6c6C1dDb6c2Fa34567829BC',
]

export function AppShell() {
  const [splash, setSplash] = useState(true)
  const [tab, setTab] = useState<Tab>('explore')
  const [dark, setDark] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [detail, setDetail] = useState<Market | null>(null)
  const [categoryDetail, setCategoryDetail] = useState<string | null>(null)
  const [trade, setTrade] = useState<{ market: Market; side: 'yes' | 'no' } | null>(
    null,
  )

  // Simulation Wallet States
  const [balance, setBalance] = useState<number>(1240.50)
  const [positions, setPositions] = useState<Position[]>(OPEN_POSITIONS)
  const [activity, setActivity] = useState<Activity[]>(RECENT_ACTIVITY)

  // Web3 Connection Simulated States
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletProvider, setWalletProvider] = useState('')
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState('')

  // Live Polymarket Data States
  const [markets, setMarkets] = useState<Market[]>(MARKETS)

  // Alerts & Notifications States
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false)
  const [activeToast, setActiveToast] = useState<{ title: string; body: string } | null>(null)
  const [notifications, setNotifications] = useState<NotificationLog[]>([
    {
      id: 'mock-1',
      title: '🐋 Whale Trade Alert',
      body: 'Wallet 0x7f4D... purchased 22,500 YES shares of "BTC hit $100K".',
      time: '12m ago',
      type: 'whale',
      read: true,
    },
    {
      id: 'mock-2',
      title: '📈 Odds Shift Alert',
      body: '"Fed Decision in July" No Change odds surged from 68% to 71% YES.',
      time: '1h ago',
      type: 'info',
      read: true,
    },
    {
      id: 'mock-3',
      title: '🔔 Target Met Alert',
      body: 'Your price alert for "SOL Velocity" to reach 75% YES was triggered.',
      time: '3h ago',
      type: 'alert',
      read: true,
    },
  ])

  // Fetch Live Polymarket Events on mount
  useEffect(() => {
    async function loadLiveMarkets() {
      try {
        const liveMarkets = await fetchLivePolymarketMarkets()
        if (liveMarkets && liveMarkets.length > 0) {
          // Prepend live API markets to mock databases
          setMarkets([...liveMarkets, ...MARKETS])
        }
      } catch (e) {
        console.error('Failed to load live Polymarket markets:', e)
      }
    }
    loadLiveMarkets()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1200)
    return () => clearTimeout(t)
  }, [])

  const openMarket = (m: Market) => setDetail(m)

  // Trigger Simulated Connection
  const handleConnect = (id: string, label: string) => {
    setConnectingProvider(label)
    setTimeout(() => {
      const randomIdx = Math.floor(Math.random() * WALLET_ADDRESSES.length)
      const selectedAddress = WALLET_ADDRESSES[randomIdx] || WALLET_ADDRESSES[0]
      
      setWalletAddress(selectedAddress)
      setWalletProvider(label)
      setWalletConnected(true)
      setConnectingProvider('')
      setShowConnectModal(false)
      setBalance(2500.00)
    }, 1800)
  }

  // Trigger simulated disconnection
  const handleDisconnect = () => {
    setWalletConnected(false)
    setWalletAddress('')
    setWalletProvider('')
    setBalance(0)
    setPositions([])
    setActivity([])
  }

  // Unified Trade Execution Simulation
  const executeTrade = (
    marketId: string,
    question: string,
    outcomeLabel: string,
    percentage: number,
    amount: number
  ) => {
    setBalance((prev) => parseFloat((prev - amount).toFixed(2)))

    const pricePerShare = percentage / 100
    const newShares = parseFloat((amount / pricePerShare).toFixed(1))

    setPositions((prev) => {
      const existingIdx = prev.findIndex(
        (p) => p.id === marketId && p.side === outcomeLabel
      )
      if (existingIdx > -1) {
        const updated = [...prev]
        const current = { ...updated[existingIdx] }
        
        const currentSharesMatch = current.meta.match(/([\d.]+)\s+shares/)
        const currentShares = currentSharesMatch ? parseFloat(currentSharesMatch[1]) : 0
        const totalShares = currentShares + newShares
        
        const totalValue = parseFloat((totalShares * pricePerShare).toFixed(2))
        
        current.value = `$${totalValue.toFixed(2)}`
        current.prob = percentage
        current.meta = `Just now · ${totalShares.toFixed(1)} shares`
        
        updated[existingIdx] = current
        return updated
      } else {
        const totalValue = parseFloat((newShares * pricePerShare).toFixed(2))
        return [
          {
            id: marketId,
            question,
            side: outcomeLabel,
            prob: percentage,
            value: `$${totalValue.toFixed(2)}`,
            pnl: '+0.00%',
            up: true,
            meta: `Just now · ${newShares.toFixed(1)} shares`,
          },
          ...prev,
        ]
      }
    })

    setActivity((prev) => [
      {
        label: `Bought ${outcomeLabel} · ${question.substring(0, 20)}...`,
        time: 'Just now',
        amount: `-${amount.toFixed(2)} USDC`,
        up: false,
      },
      ...prev,
    ])
  }

  // Custom Odds Alert Setup Listener
  const handleSetAlert = (marketId: string, question: string, percentage: number) => {
    // Simulate checking price feed and trigger alert after 10 seconds
    setTimeout(() => {
      const title = '🔔 Price Alert Triggered'
      const body = `"${question}" probability reached your target of ${percentage}%!`
      
      // 1. Show floating notification toast inside device frame
      setActiveToast({ title, body })
      
      // 2. Add to notification center list
      setNotifications((prev) => [
        {
          id: `alert-${Date.now()}`,
          title: '🔔 Price Target Met',
          body: `"${question}" reached target probability of ${percentage}% YES.`,
          time: 'Just now',
          type: 'alert',
          read: false,
        },
        ...prev,
      ])
    }, 10000)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#05070a] p-0 sm:p-6">
      {/* Android device frame */}
      <div className="relative h-screen w-full max-w-[420px] overflow-hidden bg-background sm:h-[860px] sm:rounded-[38px] sm:border-[10px] sm:border-[#05070a] sm:shadow-2xl">
        <div className={`relative h-full w-full ${dark ? '' : 'light'}`}>
          <div className="relative flex h-full flex-col bg-background text-foreground">
            {/* Floating Top Notification Toast */}
            {activeToast && (
              <div className="absolute top-16 left-4 right-4 z-50 rounded-xl border border-primary/25 bg-card/95 p-3.5 shadow-xl backdrop-blur-md animate-slide-down">
                <div className="flex gap-2.5 items-start">
                  <span className="text-xl leading-none">🔔</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{activeToast.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">{activeToast.body}</p>
                  </div>
                  <button 
                    onClick={() => setActiveToast(null)} 
                    className="text-[10px] font-bold text-primary hover:text-foreground hover:underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {splash ? (
              <SplashScreen />
            ) : (
              <div className="flex h-full flex-col bg-background">
                {/* Main content area */}
                <div className="flex-1 min-h-0 relative flex flex-col">
                  {detail ? (
                    <MarketDetail
                      market={detail}
                      balance={balance}
                      onBack={() => setDetail(null)}
                      onTrade={(side) => setTrade({ market: detail, side })}
                      onExecuteTrade={(outcomeLabel, percentage, amount) => {
                        executeTrade(detail.id, detail.question, outcomeLabel, percentage, amount)
                      }}
                      onSetAlert={handleSetAlert}
                    />
                  ) : categoryDetail ? (
                    <CategoryDetailScreen
                      categoryValue={categoryDetail}
                      onBack={() => setCategoryDetail(null)}
                      onOpenMarket={openMarket}
                    />
                  ) : (
                    <>
                      <TopBar 
                        title={TITLES[tab]} 
                        onMenu={() => setDrawer(true)} 
                        walletConnected={walletConnected}
                        walletAddress={walletAddress}
                        onConnect={() => setShowConnectModal(true)}
                        onNotifications={() => setShowAlertsDrawer(true)}
                      />
                      <main className="no-scrollbar flex-1 overflow-y-auto">
                        {tab === 'explore' && (
                          <ExploreScreen onOpenMarket={openMarket} markets={markets} />
                        )}
                        {tab === 'markets' && (
                          <MarketsScreen onOpenMarket={openMarket} markets={markets} />
                        )}
                        {tab === 'portfolio' && (
                          <PortfolioScreen 
                            balance={balance} 
                            positions={positions} 
                            activity={activity} 
                            walletConnected={walletConnected}
                            onConnect={() => setShowConnectModal(true)}
                          />
                        )}
                      </main>
                    </>
                  )}
                </div>

                {/* Persistently visible Bottom Navigation */}
                <BottomNav 
                  active={tab} 
                  onChange={(newTab) => {
                    setTab(newTab)
                    setDetail(null)
                    setCategoryDetail(null)
                  }} 
                />
              </div>
            )}

            {/* Overlays */}
            <DrawerMenu
              open={drawer}
              onClose={() => setDrawer(false)}
              dark={dark}
              onToggleTheme={() => setDark((d) => !d)}
              onSubCategoryClick={(value) => setCategoryDetail(value)}
              onNavigatePortfolio={() => setTab('portfolio')}
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              walletProvider={walletProvider}
              onConnect={() => setShowConnectModal(true)}
              onDisconnect={handleDisconnect}
            />
            {trade && (
              <TradeSheet
                market={trade.market}
                side={trade.side}
                balance={balance}
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
            />

            {/* Wallet Connect Modal Overlay */}
            {showConnectModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-5 animate-fade-in">
                <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 relative space-y-4 shadow-2xl animate-scale-up">
                  {/* Close button */}
                  <button 
                    onClick={() => {
                      if (!connectingProvider) setShowConnectModal(false)
                    }}
                    disabled={!!connectingProvider}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="text-center space-y-1.5 pb-2 border-b border-border/40">
                    <h3 className="text-base font-black text-foreground">Connect Wallet</h3>
                    <p className="text-[11px] text-muted-foreground">Select a Web3 provider to get started</p>
                  </div>

                  {connectingProvider ? (
                    // Loader screen
                    <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-pulse">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-xs font-bold text-foreground">Connecting to {connectingProvider}...</p>
                      <p className="text-[10px] text-muted-foreground">Please approve the connection in your wallet app.</p>
                    </div>
                  ) : (
                    // List of wallets
                    <div className="space-y-2.5">
                      {[
                        { id: 'metamask', label: 'MetaMask', icon: '🦊' },
                        { id: 'trustwallet', label: 'Trust Wallet', icon: '🛡️' },
                        { id: 'coinbase', label: 'Coinbase Wallet', icon: '🔵' },
                        { id: 'phantom', label: 'Phantom', icon: '👻' },
                      ].map((w) => (
                        <button
                          key={w.id}
                          onClick={() => handleConnect(w.id, w.label)}
                          className="w-full flex items-center gap-3 rounded-xl border border-border bg-secondary/15 hover:bg-secondary/35 active:scale-[0.98] transition-all p-3 text-xs font-bold text-foreground text-left"
                        >
                          <span className="text-xl shrink-0 leading-none">{w.icon}</span>
                          <span className="flex-1">{w.label}</span>
                          <span className="text-[9px] uppercase text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded font-normal shrink-0">Popular</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
