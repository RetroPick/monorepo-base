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
import { AddFundsModal } from './add-funds-modal'
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
  const [userEmail, setUserEmail] = useState('')
  const [showAddFundsModal, setShowAddFundsModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [showExternalWallets, setShowExternalWallets] = useState(false)

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

  // Trigger Simulated Social / Web3 Connection via Privy
  const handleSocialLogin = (provider: string, emailVal?: string) => {
    setConnectingProvider(provider)
    setTimeout(() => {
      let email = 'fatcurrahman125@gmail.com'
      let address = '0x23C5b64c76E0DE86981E297A4c93561a002EE300' // Deterministic address matching image
      
      if (provider === 'google') {
        email = emailVal || 'fatcurrahman125@gmail.com'
      } else if (provider === 'telegram') {
        email = '@fatcurrahman'
        address = '0x8bF4932C2b2DE51a66C93561A002EE300'
      } else if (provider === 'twitter') {
        email = '@fatcurrahman'
        address = '0x7eF4932C2b2DE51a66C93561A002EE300'
      } else if (provider === 'apple') {
        email = 'fatcur.apple@icloud.com'
        address = '0x4eF4932C2b2DE51a66C93561A002EE300'
      } else if (provider === 'email') {
        email = emailVal || 'user@example.com'
        address = '0x3eF4932C2b2DE51a66C93561A002EE300'
      } else {
        // MetaMask / External wallets
        email = 'external-wallet'
        const randomIdx = Math.floor(Math.random() * WALLET_ADDRESSES.length)
        address = WALLET_ADDRESSES[randomIdx] || WALLET_ADDRESSES[0]
      }

      setWalletConnected(true)
      setWalletAddress(address)
      setWalletProvider(provider)
      setUserEmail(email)
      setBalance(2500.00)
      setConnectingProvider('')
      setShowConnectModal(false)
      setEmailInput('')
      setShowExternalWallets(false)
    }, 1800)
  }

  // Trigger simulated disconnection
  const handleDisconnect = () => {
    setWalletConnected(false)
    setWalletAddress('')
    setWalletProvider('')
    setUserEmail('')
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
                        userEmail={userEmail}
                        onConnect={() => setShowConnectModal(true)}
                        onOpenAddFunds={() => setShowAddFundsModal(true)}
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
                            onOpenAddFunds={() => setShowAddFundsModal(true)}
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
              userEmail={userEmail}
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

            {/* Add Funds Modal Overlay */}
            <AddFundsModal
              open={showAddFundsModal}
              onClose={() => setShowAddFundsModal(false)}
              balance={balance}
              walletAddress={walletAddress}
              onAddBalance={(amountVal, description) => {
                setBalance((prev) => parseFloat((prev + amountVal).toFixed(2)))
                setActivity((prev) => [
                  {
                    id: `deposit-${Date.now()}`,
                    marketQuestion: description,
                    outcome: 'Deposit',
                    amount: amountVal,
                    price: 1.00,
                    shares: amountVal.toFixed(1),
                    time: 'Just now',
                    type: 'buy',
                  },
                  ...prev
                ])
              }}
            />

            {/* Privy Sign In Modal Overlay */}
            {showConnectModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-5 animate-fade-in">
                <div className="w-full max-w-xs rounded-3xl border border-border bg-card p-6 relative space-y-4 shadow-2xl animate-scale-up">
                  {/* Close button */}
                  <button 
                    onClick={() => {
                      if (!connectingProvider) {
                        setShowConnectModal(false)
                        setShowExternalWallets(false)
                        setEmailInput('')
                      }
                    }}
                    disabled={!!connectingProvider}
                    className="absolute right-4.5 top-4.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {connectingProvider ? (
                    // Loader screen
                    <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-pulse">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-xs font-bold text-foreground">Logging in via {connectingProvider}...</p>
                      <p className="text-[10px] text-muted-foreground text-center">Creating your secure embedded Web3 wallet...</p>
                    </div>
                  ) : showExternalWallets ? (
                    // External Web3 wallets list
                    <div className="space-y-4">
                      <div className="text-center space-y-1">
                        <h3 className="text-sm font-black text-foreground">Connect External Wallet</h3>
                        <p className="text-[10px] text-muted-foreground">Select your cryptocurrency e-wallet app</p>
                      </div>

                      <div className="space-y-2">
                        {[
                          { id: 'metamask', label: 'MetaMask', icon: '🦊' },
                          { id: 'trustwallet', label: 'Trust Wallet', icon: '🛡️' },
                          { id: 'coinbase', label: 'Coinbase Wallet', icon: '🔵' },
                          { id: 'phantom', label: 'Phantom', icon: '👻' },
                        ].map((w) => (
                          <button
                            key={w.id}
                            onClick={() => handleSocialLogin(w.id)}
                            className="w-full flex items-center gap-3 rounded-xl border border-border bg-secondary/15 hover:bg-secondary/35 active:scale-[0.98] transition-all p-3 text-xs font-bold text-foreground text-left"
                          >
                            <span className="text-xl shrink-0 leading-none">{w.icon}</span>
                            <span className="flex-1">{w.label}</span>
                            <span className="text-[9px] uppercase text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded font-normal shrink-0">Popular</span>
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowExternalWallets(false)}
                        className="w-full text-center text-[10px] font-bold text-primary hover:underline pt-1.5"
                      >
                        ← Back to Social Sign In
                      </button>
                    </div>
                  ) : (
                    // Privy Social Sign In
                    <div className="space-y-4">
                      <div className="text-center space-y-1.5">
                        <h3 className="text-sm font-black text-foreground">Sign in to RetroPick</h3>
                        <p className="text-[10px] text-muted-foreground">Log in instantly to access trading pools</p>
                      </div>

                      {/* Email input box */}
                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/10 px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary/50"
                        />
                        <button
                          onClick={() => {
                            if (emailInput.trim()) {
                              handleSocialLogin('email', emailInput.trim())
                            }
                          }}
                          disabled={!emailInput.trim()}
                          className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all text-center"
                        >
                          Continue
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-[1px] flex-1 bg-border/40" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">or continue with</span>
                        <div className="h-[1px] flex-1 bg-border/40" />
                      </div>

                      {/* Social Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Google */}
                        <button
                          onClick={() => handleSocialLogin('google')}
                          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/25 active:scale-[0.97] transition-all p-2.5 text-[11px] font-bold text-foreground"
                        >
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.59 5.59 0 0 1 8.4 12.928a5.59 5.59 0 0 1 5.59-5.592c2.44 0 4.382 1.484 5.21 3.518l3.864-1.5C21.43 5.485 17.525 3 14 3a9.92 9.92 0 0 0-10 10 9.92 9.92 0 0 0 10 10c5.38 0 9.61-3.8 9.61-9.623 0-.676-.08-1.29-.225-1.782h-11.145Z"/>
                          </svg>
                          Google
                        </button>

                        {/* Apple */}
                        <button
                          onClick={() => handleSocialLogin('apple')}
                          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/25 active:scale-[0.97] transition-all p-2.5 text-[11px] font-bold text-foreground"
                        >
                          <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.56 2.95-1.39Z"/>
                          </svg>
                          Apple
                        </button>

                        {/* Twitter */}
                        <button
                          onClick={() => handleSocialLogin('twitter')}
                          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/25 active:scale-[0.97] transition-all p-2.5 text-[11px] font-bold text-foreground"
                        >
                          <svg className="h-3.5 w-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          Twitter
                        </button>

                        {/* Telegram */}
                        <button
                          onClick={() => handleSocialLogin('telegram')}
                          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/25 active:scale-[0.97] transition-all p-2.5 text-[11px] font-bold text-foreground"
                        >
                          <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.82-.76 4.38-1.07 6.06-.13.71-.39.95-.64.97-.56.05-1-.37-1.54-.73-.85-.56-1.33-.91-2.16-1.46-.96-.64-.34-1 .21-1.57.14-.15 2.65-2.43 2.7-2.65.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.89 1.2-5.32 3.52-.5.35-.96.52-1.37.51-.45-.01-1.32-.26-1.97-.47-.79-.26-1.42-.4-1.37-.85.03-.23.35-.47.96-.72 3.76-1.63 6.27-2.71 7.54-3.23 3.58-1.48 4.32-1.74 4.81-1.75.11 0 .35.03.5.16.13.11.17.26.19.38.01.07.02.22 0 .34z"/>
                          </svg>
                          Telegram
                        </button>
                      </div>

                      {/* Connect External Wallet Option */}
                      <div className="pt-2 text-center border-t border-border/40">
                        <button
                          onClick={() => setShowExternalWallets(true)}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Connect External Web3 Wallet
                        </button>
                      </div>
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
