'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Activity,
  Trophy,
  Wallet,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Zap,
  Info,
  CheckCircle2,
  X,
  Sparkles,
  SlidersHorizontal,
  Bell,
  ChevronRight,
  ChevronLeft,
  Share2,
  Play,
  RotateCcw,
  Sliders,
  DollarSign,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock Data for Whale Trade Feed matching mockup
const WHALE_FEEDS = [
  {
    id: 'wf-1',
    wallet: '0x72F...9A3',
    ens: '0x72F...9A3',
    avatar: '👑',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Bitcoin ETF Approval?',
    amountUsdc: '$42,500',
    time: '18m',
    tag: 'Mega Whale',
    tagType: 'amber',
    barColor: 'amber',
  },
  {
    id: 'wf-2',
    wallet: '0xA3f...9c2',
    ens: '0xA3f...9c2',
    avatar: '🐋',
    type: 'BUY',
    outcome: 'NO',
    marketTitle: 'Fed Rate Cut in March?',
    amountUsdc: '$120,000',
    time: '34m',
    tag: 'Smart Money • 84%',
    tagType: 'indigo',
    barColor: 'amber',
  },
  {
    id: 'wf-3',
    wallet: '0x99B...4D1',
    ens: '0x99B...4D1',
    avatar: '⚡',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Ethereum ETF Approval?',
    amountUsdc: '$18,200',
    time: '1h',
    tag: 'Alpha Hunter',
    tagType: 'indigo',
    barColor: 'emerald',
  },
  {
    id: 'wf-4',
    wallet: '0x72F...9A3',
    ens: '0x72F...9A3',
    avatar: '👑',
    type: 'BUY',
    outcome: 'NO',
    marketTitle: 'Trump 2028 Nomination',
    amountUsdc: '$65,000',
    time: '2h',
    tag: 'Mega Whale',
    tagType: 'amber',
    barColor: 'amber',
  },
  {
    id: 'wf-5',
    wallet: '0x88C...E12',
    ens: '0x88C...E12',
    avatar: '🚀',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Solana Above $250 in Q2?',
    amountUsdc: '$88,400',
    time: '3h',
    tag: 'Whale Cluster',
    tagType: 'indigo',
    barColor: 'emerald',
  },
  {
    id: 'wf-6',
    wallet: '0x15F...00B',
    ens: '0x15F...00B',
    avatar: '🏛️',
    type: 'BUY',
    outcome: 'NO',
    marketTitle: 'US Inflation Below 2.5%?',
    amountUsdc: '$210,000',
    time: '4h',
    tag: 'Macro Whale',
    tagType: 'amber',
    barColor: 'amber',
  },
  {
    id: 'wf-7',
    wallet: '0xDF4...88A',
    ens: '0xDF4...88A',
    avatar: '🛰️',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'SpaceX Starship Orbit Test?',
    amountUsdc: '$35,000',
    time: '5h',
    tag: 'Tech Insider',
    tagType: 'indigo',
    barColor: 'emerald',
  },
  {
    id: 'wf-8',
    wallet: '0x77E...119',
    ens: '0x77E...119',
    avatar: '🤖',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'AI Executive Order Revision?',
    amountUsdc: '$95,000',
    time: '6h',
    tag: 'Policy Expert',
    tagType: 'indigo',
    barColor: 'emerald',
  },
  {
    id: 'wf-9',
    wallet: '0x44B...99C',
    ens: '0x44B...99C',
    avatar: '🏈',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'Super Bowl LX Champion?',
    amountUsdc: '$150,000',
    time: '8h',
    tag: 'Sports Sharps',
    tagType: 'amber',
    barColor: 'amber',
  },
  {
    id: 'wf-10',
    wallet: '0x33A...88F',
    ens: '0x33A...88F',
    avatar: '🌐',
    type: 'BUY',
    outcome: 'NO',
    marketTitle: 'China Tech Export Restrictions?',
    amountUsdc: '$72,500',
    time: '10h',
    tag: 'Geopolitics',
    tagType: 'amber',
    barColor: 'amber',
  },
  {
    id: 'wf-11',
    wallet: '0x1A2...B4C',
    ens: '0x1A2...B4C',
    avatar: '📈',
    type: 'BUY',
    outcome: 'YES',
    marketTitle: 'S&P 500 New ATH in Q2?',
    amountUsdc: '$310,000',
    time: '12h',
    tag: 'Mega Whale',
    tagType: 'amber',
    barColor: 'emerald',
  },
  {
    id: 'wf-12',
    wallet: '0x99B...4D1',
    ens: '0x99B...4D1',
    avatar: '🔐',
    type: 'BUY',
    outcome: 'NO',
    marketTitle: 'Tether Audit Completed?',
    amountUsdc: '$45,000',
    time: '14h',
    tag: 'Alpha Hunter',
    tagType: 'indigo',
    barColor: 'amber',
  },
]

// Mock Data for Smart Traders Leaderboard matching mockup
const LEADERBOARD_TRADERS = [
  {
    rank: 1,
    wallet: '0x72F...9A3',
    ens: '0x72F...9A3',
    fullEns: '0x72F...9A3',
    verified: true,
    score: 94,
    roi: '+32.4%',
    winRate: 84,
    pnl: '+$84,200',
    topCategory: 'Crypto',
    categoryPct: 91,
    avatar: '👑',
  },
  {
    rank: 2,
    wallet: '0x1A2...B4C',
    ens: '0x1A2...B4C',
    fullEns: '0x1A2...B4C',
    verified: true,
    score: 91,
    roi: '+28.1%',
    winRate: 79,
    pnl: '+$62,400',
    topCategory: 'Macro',
    categoryPct: 88,
    avatar: '🐋',
  },
  {
    rank: 3,
    wallet: '0xA3f...9c2',
    ens: '0xA3f...9c2',
    fullEns: '0xA3f...9c2',
    verified: false,
    score: 88,
    roi: '+19.6%',
    winRate: 81,
    pnl: '+$45,100',
    topCategory: 'Politics',
    categoryPct: 85,
    avatar: '⚡',
  },
  {
    rank: 4,
    wallet: '0x99B...4D1',
    ens: '0x99B...4D1',
    fullEns: '0x99B...4D1',
    verified: true,
    score: 82,
    roi: '+41.2%',
    winRate: 68,
    pnl: '+$91,000',
    topCategory: 'Sports',
    categoryPct: 76,
    avatar: '🎲',
  },
  {
    rank: 5,
    wallet: '0x33A...88F',
    ens: '0x33A...88F',
    fullEns: '0x33A...88F',
    verified: false,
    score: 76,
    roi: '+12.4%',
    winRate: 74,
    pnl: '+$18,500',
    topCategory: 'Crypto',
    categoryPct: 70,
    avatar: '🎯',
  },
  {
    rank: 6,
    wallet: '0x88C...E12',
    ens: '0x88C...E12',
    fullEns: '0x88C...E12',
    verified: true,
    score: 74,
    roi: '+54.8%',
    winRate: 72,
    pnl: '+$112,300',
    topCategory: 'DeFi',
    categoryPct: 82,
    avatar: '🚀',
  },
  {
    rank: 7,
    wallet: '0x15F...00B',
    ens: '0x15F...00B',
    fullEns: '0x15F...00B',
    verified: false,
    score: 71,
    roi: '+22.9%',
    winRate: 69,
    pnl: '+$31,800',
    topCategory: 'Economy',
    categoryPct: 78,
    avatar: '🏛️',
  },
  {
    rank: 8,
    wallet: '0xDF4...88A',
    ens: '0xDF4...88A',
    fullEns: '0xDF4...88A',
    verified: true,
    score: 69,
    roi: '+38.5%',
    winRate: 67,
    pnl: '+$56,700',
    topCategory: 'Tech',
    categoryPct: 84,
    avatar: '🛰️',
  },
  {
    rank: 9,
    wallet: '0x77E...119',
    ens: '0x77E...119',
    fullEns: '0x77E...119',
    verified: false,
    score: 67,
    roi: '+17.3%',
    winRate: 65,
    pnl: '+$24,100',
    topCategory: 'AI',
    categoryPct: 89,
    avatar: '🤖',
  },
  {
    rank: 10,
    wallet: '0x44B...99C',
    ens: '0x44B...99C',
    fullEns: '0x44B...99C',
    verified: true,
    score: 65,
    roi: '+61.0%',
    winRate: 63,
    pnl: '+$78,900',
    topCategory: 'Sports',
    categoryPct: 93,
    avatar: '🏈',
  },
  {
    rank: 11,
    wallet: '0x22D...11A',
    ens: '0x22D...11A',
    fullEns: '0x22D...11A',
    verified: false,
    score: 63,
    roi: '+14.2%',
    winRate: 62,
    pnl: '+$19,400',
    topCategory: 'Crypto',
    categoryPct: 68,
    avatar: '💎',
  },
  {
    rank: 12,
    wallet: '0x66E...55B',
    ens: '0x66E...55B',
    fullEns: '0x66E...55B',
    verified: true,
    score: 60,
    roi: '+29.7%',
    winRate: 60,
    pnl: '+$41,200',
    topCategory: 'Macro',
    categoryPct: 71,
    avatar: '📊',
  },
]

export function IntelligenceScreen({
  onSelectMarket
}: {
  onSelectMarket?: (marketId: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'whales' | 'traders' | 'paper'>('whales')
  const [searchQuery, setSearchQuery] = useState('')
  const [followingWallets, setFollowingWallets] = useState<string[]>(['0x72F...9A3'])
  const isMounted = useRef(false)

  // Hydration-safe initial load from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('retropick_following_wallets')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFollowingWallets(parsed)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Persist followingWallets state to localStorage on updates after initial mount
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    try {
      localStorage.setItem('retropick_following_wallets', JSON.stringify(followingWallets))
    } catch (e) {
      console.error(e)
    }
  }, [followingWallets])
  const [selectedTraderProfile, setSelectedTraderProfile] = useState<any>(null)
  const [showQuickBacktestModal, setShowQuickBacktestModal] = useState(false)
  const [showPaperFollowConfirmation, setShowPaperFollowConfirmation] = useState(false)
  const [showWhaleAlertsSettings, setShowWhaleAlertsSettings] = useState(false)

  const [alertedMarkets, setAlertedMarkets] = useState<string[]>(['m-3'])

  // Backtest Simulation Settings
  const [backtestTimeframe, setBacktestTimeframe] = useState<'30D' | '90D' | 'ALL'>('30D')
  const [backtestStartingBalance, setBacktestStartingBalance] = useState<number>(1000)
  const [backtestCopySize, setBacktestCopySize] = useState<number>(25)

  // Paper Follow Settings
  const [paperBalanceInput, setPaperBalanceInput] = useState<number>(1000)
  const [paperCopySizeInput, setPaperCopySizeInput] = useState<number>(25)
  const [paperMaxPerTradeInput, setPaperMaxPerTradeInput] = useState<number>(50)
  const [paperCategoryInput, setPaperCategoryInput] = useState<string>('All')

  // Whale Alerts Settings
  const [whaleAlertsEnabled, setWhaleAlertsEnabled] = useState(true)
  const [followedWalletsAlertsEnabled, setFollowedWalletsAlertsEnabled] = useState(true)
  const [minTradeThreshold, setMinTradeThreshold] = useState(5000)
  const [minSmartScore, setMinSmartScore] = useState(70)
  const [alertCategory, setAlertCategory] = useState('All')
  const [quietHours, setQuietHours] = useState('10 PM - 7 AM')
  const [dailyMaxAlerts, setDailyMaxAlerts] = useState(12)

  // Paper Portfolio Virtual State
  const [paperPortfolioEquity] = useState(1240.00)
  const [simulatedFills] = useState([
    {
      id: 'fill-1',
      trader: 'macroking.eth',
      market: 'Bitcoin ETF Approval?',
      side: 'YES',
      sourcePrice: '42.0¢',
      simFill: '44.3¢',
      slippage: '+2.3¢',
      time: '12m ago'
    }
  ])

  const [selectedDetailView, setSelectedDetailView] = useState<{ type: 'whale' | 'trader'; item: any } | null>(null)

  const toggleFollow = (wallet: string) => {
    if (followingWallets.includes(wallet)) {
      setFollowingWallets(prev => prev.filter(w => w !== wallet))
    } else {
      setFollowingWallets(prev => [...prev, wallet])
    }
  }

  const toggleMarketAlert = (marketId: string) => {
    if (alertedMarkets.includes(marketId)) {
      setAlertedMarkets(prev => prev.filter(m => m !== marketId))
    } else {
      setAlertedMarkets(prev => [...prev, marketId])
    }
  }

  // Prevent background scrolling when Copy Strategy modal is open (matching login/limit modal behavior)
  useEffect(() => {
    if (showPaperFollowConfirmation) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showPaperFollowConfirmation])

  return (
    <div className={cn(
      "relative flex flex-col h-full bg-background animate-fade-up px-4 pb-32 pt-2 space-y-3.5 text-foreground min-h-0 no-scrollbar",
      showPaperFollowConfirmation ? "overflow-hidden" : "overflow-y-auto"
    )}>
      
      {/* ========================================================================= */}
      {/* DETAIL VIEW SCREEN (TRIGGERED WHEN TAPPING AN ITEM FROM LIST) */}
      {/* ========================================================================= */}
      {selectedDetailView ? (
        <div className="space-y-4 animate-fade-in pt-1">
          {/* Detail View Header with Back Chevron */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <button
              onClick={() => setSelectedDetailView(null)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-bold text-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5px]" />
              <span>{selectedDetailView.type === 'whale' ? 'Whale Activity' : 'Trader Profile'}</span>
            </button>
            <button className="text-muted-foreground hover:text-foreground p-1 cursor-pointer">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* DETAIL VIEW VARIANT 1: WHALE ACTIVITY (SCREEN 2) */}
          {selectedDetailView.type === 'whale' && (
            <div className="space-y-4">
              {/* Profile Header (Text Only, No Avatar Image) */}
              <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3 shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-black text-foreground">
                      {selectedDetailView.item?.ens || selectedDetailView.item?.wallet || '0x72F...9A3'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/15 border border-primary/20 text-primary font-mono text-[10px] font-bold">
                      {selectedDetailView.item?.tag || 'Mega Whale'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono font-medium">
                    Large position • High conviction trader
                  </p>
                </div>

                {/* Stats Row (3 Metrics) */}
                <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Position</span>
                    <span className="text-sm font-black text-foreground">$500K+</span>
                  </div>
                  <div className="space-y-0.5 border-x border-border/60 px-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Markets Traded</span>
                    <span className="text-sm font-black text-foreground">12</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Win Rate</span>
                    <span className="text-sm font-black text-foreground">82%</span>
                  </div>
                </div>
              </div>

              {/* Latest Activity Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-200 px-0.5">Latest Activity</h3>
                
                <div className="p-4 rounded-2xl bg-[#141A26] border border-slate-800 space-y-4">
                  {[
                    { type: 'BUY', side: 'YES', market: 'Bitcoin ETF', amount: '$42,500', time: '2m ago' },
                    { type: 'SELL', side: 'NO', market: 'Fed Rate Cut', amount: '$120,000', time: '5m ago' },
                    { type: 'BUY', side: 'YES', market: 'Ethereum ETF', amount: '$85,000', time: '12m ago' },
                    { type: 'BUY', side: 'YES', market: 'AI Regulation', amount: '$50,000', time: '1h ago' },
                  ].map((act, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono relative pl-4 border-l-2 border-indigo-600/40">
                      <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black border",
                            act.side === 'YES'
                              ? "bg-emerald-950/90 border-emerald-700 text-emerald-400"
                              : "bg-rose-950/90 border-rose-700 text-rose-400"
                          )}>
                            {act.side}
                          </span>
                          <span className="font-bold text-white">
                            {act.type === 'BUY' ? 'Bought' : 'Sold'} {act.side} on {act.market}
                          </span>
                        </div>
                        <span className="font-black text-white text-xs block pl-0.5">{act.amount}</span>
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Focus Section (Chart & Breakdown - No Politics) */}
              <div className="p-4 rounded-2xl bg-[#141A26] border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200">Market Focus</h3>
                  <span className="text-[10px] font-mono text-slate-400">Activity Distribution</span>
                </div>

                {/* Multi-segment Progress Bar Chart */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded-full bg-slate-900 overflow-hidden flex p-0.5 gap-0.5 border border-slate-800">
                    <div className="h-full bg-indigo-500 rounded-l-full transition-all duration-500" style={{ width: '65%' }} />
                    <div className="h-full bg-sky-400 transition-all duration-500" style={{ width: '20%' }} />
                    <div className="h-full bg-purple-400 transition-all duration-500" style={{ width: '10%' }} />
                    <div className="h-full bg-emerald-400 rounded-r-full transition-all duration-500" style={{ width: '5%' }} />
                  </div>
                </div>

                {/* Category Breakdown Cards */}
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="text-xs text-slate-300 font-semibold">Crypto</span>
                    </div>
                    <span className="text-xs font-bold text-white">65%</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
                      <span className="text-xs text-slate-300 font-semibold">Macro</span>
                    </div>
                    <span className="text-xs font-bold text-white">20%</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                      <span className="text-xs text-slate-300 font-semibold">Tech & AI</span>
                    </div>
                    <span className="text-xs font-bold text-white">10%</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-300 font-semibold">DeFi</span>
                    </div>
                    <span className="text-xs font-bold text-white">5%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DETAIL VIEW VARIANT 2: TRADER PROFILE (SCREEN 1) */}
          {selectedDetailView.type === 'trader' && (
            <div className="space-y-4">
              {/* Profile Header (Text-only + Top Right Compact Action Buttons) */}
              <div className="p-4 rounded-2xl bg-[#141A26] border border-slate-800 space-y-3.5 shadow-md">
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Text Identity & Badges */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-base font-black text-white">
                        {selectedDetailView.item?.fullEns || selectedDetailView.item?.wallet || '0x72F...9A3'}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                        Rank #{selectedDetailView.item?.rank || 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-700/80 text-indigo-300 font-bold">
                        Smart Trader
                      </span>
                    </div>
                  </div>

                  {/* Right: Small Compact Buttons inside Profile Header */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleFollow(selectedDetailView.item?.wallet || '0x72F...9A3')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition cursor-pointer border",
                        followingWallets.includes(selectedDetailView.item?.wallet || '0x72F...9A3')
                          ? "bg-slate-800/90 border-slate-700 text-slate-300"
                          : "bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white"
                      )}
                    >
                      {followingWallets.includes(selectedDetailView.item?.wallet || '0x72F...9A3') ? 'Following' : '+ Follow'}
                    </button>
                    <button
                      onClick={() => setShowPaperFollowConfirmation(true)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 font-mono text-[11px] font-bold transition cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Smart Score Card */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Smart Score</span>
                    <span className="text-2xl font-black text-white">{selectedDetailView.item?.score || 94}<span className="text-xs text-slate-400 font-medium">/100</span></span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60">
                    ▲ +24.6% <span className="text-[10px] text-slate-400 font-normal">vs. last 30D</span>
                  </span>
                </div>

                {/* Metrics Row (3 Cards) */}
                <div className="grid grid-cols-3 gap-2 font-mono text-center pt-0.5">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">ROI</span>
                    <span className="text-sm font-black text-emerald-400">{selectedDetailView.item?.roi || '+32.4%'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Win Rate</span>
                    <span className="text-sm font-black text-white">{selectedDetailView.item?.winRate || 84}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Total PnL</span>
                    <span className="text-sm font-black text-white">{selectedDetailView.item?.pnl || '+$84,200'}</span>
                  </div>
                </div>
              </div>

              {/* Trading Style Progress Bars (No Politics) */}
              <div className="p-4 rounded-2xl bg-[#141A26] border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200">Trading Style</h3>

                <div className="space-y-2.5 font-mono text-xs">
                  {[
                    { cat: 'Crypto', pct: 92 },
                    { cat: 'Macro / Economy', pct: 84 },
                    { cat: 'Tech & AI', pct: 78 },
                    { cat: 'DeFi', pct: 72 },
                    { cat: 'Sports', pct: 68 },
                  ].map((style) => (
                    <div key={style.cat} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-semibold">{style.cat}</span>
                        <span className="font-bold text-white">{style.pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full"
                          style={{ width: `${style.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Predictions */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-200 px-0.5">Recent Predictions</h3>

                <div className="space-y-2.5">
                  {[
                    { title: 'Bitcoin ETF Approval?', side: 'YES', price: '42¢', time: '2h ago' },
                    { title: 'Fed Rate Cut in March?', side: 'NO', price: '71¢', time: '5h ago' },
                    { title: 'Ethereum ETF in Q2?', side: 'YES', price: '65¢', time: '12h ago' },
                  ].map((pred, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-[#141A26] border border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white">{pred.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded font-mono text-[9px] font-black border",
                            pred.side === 'YES'
                              ? "bg-emerald-950/90 border-emerald-700 text-emerald-400"
                              : "bg-rose-950/90 border-rose-700 text-rose-400"
                          )}>
                            {pred.side}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Bought @ {pred.price}</span>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 shrink-0">{pred.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* MAIN LIST TAB SCREEN (WHALES LIST | TRADERS LIST | PAPER COPY OVERVIEW) */
        /* ========================================================================= */
        <>
          {/* Search Input persistent at top */}
          <div className="relative">
            <div className="flex items-center gap-2.5 bg-card border border-border/60 rounded-2xl px-3.5 py-3 shadow-sm focus-within:border-primary/80 transition-all">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wallet, ENS, or market..."
                className="w-full bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search dropdown results */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-2 rounded-2xl bg-card border border-border/60 shadow-2xl space-y-1 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider block">Matching Traders</span>
                {LEADERBOARD_TRADERS.filter(t => t.ens.toLowerCase().includes(searchQuery.toLowerCase()) || t.wallet.toLowerCase().includes(searchQuery.toLowerCase())).map((trader) => (
                  <div
                    key={trader.rank}
                    onClick={() => {
                      setSelectedDetailView({ type: 'trader', item: trader })
                      setSearchQuery('')
                    }}
                    className="p-2 rounded-xl hover:bg-secondary/40 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{trader.fullEns}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 border border-primary/20 text-primary font-mono">Score {trader.score}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">{trader.roi} ROI</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Icon+Text Expandable Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-card rounded-2xl border border-border/60 shadow-sm">
            {[
              { id: 'whales', label: 'Whales', icon: Activity },
              { id: 'traders', label: 'Traders', icon: Trophy },
              { id: 'paper', label: 'Paper Copy', icon: Wallet },
            ].map((t) => {
              const Icon = t.icon
              const isActive = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    "flex h-9 items-center justify-center gap-2 transition-all duration-200 cursor-pointer rounded-xl text-xs font-bold my-auto",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 px-3.5 flex-1"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 px-3 shrink-0"
                  )}
                  title={t.label}
                >
                  <Icon className={cn("w-4 h-4 shrink-0 stroke-[2.2px]", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  {isActive && (
                    <span className="whitespace-nowrap font-extrabold text-xs">
                      {t.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ========================================================================= */}
          {/* MAIN TAB 1: WHALES FEED LIST */}
          {/* ========================================================================= */}
          {activeTab === 'whales' && (
            <div className="space-y-3 animate-fade-in pt-0.5">
              {WHALE_FEEDS.map((feed) => (
                <div
                  key={feed.id}
                  onClick={() => setSelectedDetailView({ type: 'whale', item: feed })}
                  className="p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden flex gap-3 shadow-sm"
                >
                  {/* Left Vertical Bar Accent */}
                  <div className={cn(
                    "w-1 rounded-full shrink-0 my-0.5",
                    feed.barColor === 'emerald' ? "bg-emerald-500" : "bg-primary"
                  )} />

                  <div className="flex-1 space-y-2">
                    {/* Top Row: Title & Time */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">{feed.marketTitle}</h4>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">{feed.time}</span>
                    </div>

                    {/* Middle Row: Badge & Amount */}
                    <div className="flex items-center gap-2 font-mono">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black tracking-wide border",
                        feed.outcome === 'YES'
                          ? "bg-emerald-950/80 border-emerald-700/80 text-emerald-400"
                          : "bg-rose-950/80 border-rose-700/80 text-rose-400"
                      )}>
                        {feed.type === 'BUY' ? 'BOUGHT' : 'SOLD'} {feed.outcome}
                      </span>
                      <span className="text-base font-black text-foreground">{feed.amountUsdc}</span>
                    </div>

                    {/* Bottom Row: Handle & Tag Badge */}
                    <div className="flex items-center justify-between font-mono text-xs pt-0.5">
                      <span className="text-muted-foreground font-semibold">{feed.ens}</span>
                      {feed.tag ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border bg-secondary/40 border-border/60 text-foreground">
                          {feed.tag}
                        </span>
                      ) : <span />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MAIN TAB 2: TRADERS LEADERBOARD LIST */}
          {/* ========================================================================= */}
          {activeTab === 'traders' && (
            <div className="space-y-3 animate-fade-in pt-0.5">
              <div className="space-y-2.5">
                {LEADERBOARD_TRADERS.map((trader) => (
                  <div
                    key={trader.rank}
                    onClick={() => setSelectedDetailView({ type: 'trader', item: trader })}
                    className="p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Number */}
                      <span className="font-mono text-xs font-bold text-muted-foreground shrink-0 w-5">
                        {String(trader.rank).padStart(2, '0')}
                      </span>

                      {/* Emerald Ring Circular Score */}
                      <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#1E293B"
                            strokeWidth="2.8"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="2.8"
                            strokeDasharray={`${trader.score}, 100`}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-black text-foreground">
                          {trader.score}
                        </span>
                      </div>

                      {/* Trader Handle & Metrics */}
                      <div className="space-y-0.5 truncate">
                        <h4 className="font-mono text-xs font-bold text-foreground truncate">{trader.fullEns}</h4>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">ROI {trader.roi}</span>
                          <span className="text-muted-foreground font-medium">WR {trader.winRate}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Category Specialty */}
                    <div className="text-right font-mono shrink-0">
                      <span className="text-[10px] text-muted-foreground font-semibold block">{trader.topCategory}</span>
                      <span className="text-xs font-bold text-foreground block">{trader.categoryPct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MAIN TAB 3: PAPER COPY / PORTFOLIO OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === 'paper' && (
            <div className="space-y-4 animate-fade-in pt-0.5">
              {/* Your Portfolio Card */}
              <div className="p-5 rounded-2xl border border-primary/30 bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-foreground">Your Portfolio</h3>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 font-mono bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-700/60">
                    ▲ +28.4% <span className="text-[10px] text-muted-foreground font-normal">vs. starting balance</span>
                  </span>
                </div>

                <div className="pt-0.5">
                  <span className="text-3xl font-black text-foreground font-mono">$1,284.00</span>
                </div>

                {/* Vector SVG Performance Area Chart */}
                <div className="h-16 w-full pt-1">
                  <svg viewBox="0 0 200 40" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 35 Q 40 30 70 20 T 140 15 T 200 5 L 200 40 L 0 40 Z"
                      fill="url(#chartGrad)"
                    />
                    <path
                      d="M 0 35 Q 40 30 70 20 T 140 15 T 200 5"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                    />
                    <circle cx="200" cy="5" r="3.5" fill="#818cf8" />
                  </svg>
                </div>

                {/* Real Details Row */}
                <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Starting Balance</span>
                    <span className="font-extrabold text-foreground">$1,000.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Trading Period</span>
                    <span className="font-extrabold text-foreground">90 Days</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowPaperFollowConfirmation(true)}
                  className="w-full py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs shadow-md transition flex items-center justify-center cursor-pointer font-mono"
                >
                  <span>Copy Strategy</span>
                </button>
              </div>

              {/* Following Traders Section */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">Following Traders</h3>
                  <span className="text-[10px] font-mono text-primary font-bold">{followingWallets.length} Active</span>
                </div>

                <div className="space-y-2.5">
                  {LEADERBOARD_TRADERS.filter(t => followingWallets.includes(t.wallet)).length > 0 ? (
                    LEADERBOARD_TRADERS.filter(t => followingWallets.includes(t.wallet)).map((trader, idx) => (
                      <div
                        key={trader.wallet}
                        onClick={() => setSelectedDetailView({ type: 'trader', item: trader })}
                        className="p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank / Index Number */}
                          <span className="font-mono text-xs font-bold text-muted-foreground shrink-0 w-5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>

                          {/* Emerald Ring Circular Score */}
                          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#1E293B"
                                strokeWidth="2.8"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#10B981"
                                strokeWidth="2.8"
                                strokeDasharray={`${trader.score}, 100`}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-black text-foreground">
                              {trader.score}
                            </span>
                          </div>

                          {/* Trader Handle & Active Period */}
                          <div className="space-y-0.5 truncate">
                            <h4 className="font-mono text-xs font-bold text-foreground truncate">{trader.fullEns}</h4>
                            <span className="text-[10px] font-mono text-muted-foreground block">30D Active</span>
                          </div>
                        </div>

                        {/* Right Column: Return % and Profit $ */}
                        <div className="text-right font-mono shrink-0">
                          <span className="text-xs font-extrabold text-emerald-400 block">{trader.roi}</span>
                          <span className="text-[10px] font-bold text-emerald-400 block">{trader.pnl}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-card border border-border/60 text-center font-mono text-xs text-muted-foreground space-y-1 shadow-sm">
                      <p className="font-bold text-foreground">No Traders Followed Yet</p>
                      <p className="text-[11px] text-muted-foreground">Tap "+ Follow" on any trader in the Traders tab to start auto-copying.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* COPY STRATEGY BOTTOM SHEET MODAL (LOCKED NON-SCROLLABLE LIKE LOGIN MODAL) */}
      {/* ========================================================================= */}
      {showPaperFollowConfirmation && (
        <div className="absolute inset-0 z-[110] flex items-end justify-center bg-black/80 backdrop-blur-md animate-fade-in p-0 overflow-hidden">
          <div className="absolute inset-0" onClick={() => setShowPaperFollowConfirmation(false)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl border-t border-border/80 bg-card text-foreground p-5 pb-6 shadow-2xl animate-slide-up space-y-3.5 max-h-[calc(85vh-92px)] overflow-hidden">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-1 cursor-pointer" onClick={() => setShowPaperFollowConfirmation(false)} />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Copy Strategy</h3>
                <span className="text-[10px] font-mono text-muted-foreground">Position copying parameters</span>
              </div>
              <button onClick={() => setShowPaperFollowConfirmation(false)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Trader Header (Text-only, Synchronized with Selected Trader) */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between font-mono">
              <span className="text-xs text-muted-foreground font-medium">Target Trader:</span>
              <span className="text-xs font-black text-foreground">
                {selectedDetailView?.item?.fullEns || selectedDetailView?.item?.wallet || '0x72F...9A3'}
              </span>
            </div>

            {/* Configuration Inputs */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Starting balance</span>
                <div className="flex items-center bg-secondary/40 border border-border/60 rounded-lg px-2.5 py-1">
                  <span className="text-muted-foreground mr-1">$</span>
                  <input
                    type="number"
                    value={paperBalanceInput}
                    onChange={(e) => setPaperBalanceInput(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-right font-bold text-foreground outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Copy amount per trade</span>
                <div className="flex items-center bg-secondary/40 border border-border/60 rounded-lg px-2.5 py-1">
                  <span className="text-muted-foreground mr-1">$</span>
                  <input
                    type="number"
                    value={paperCopySizeInput}
                    onChange={(e) => setPaperCopySizeInput(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-right font-bold text-foreground outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Maximum per trade</span>
                <div className="flex items-center bg-secondary/40 border border-border/60 rounded-lg px-2.5 py-1">
                  <span className="text-muted-foreground mr-1">$</span>
                  <input
                    type="number"
                    value={paperMaxPerTradeInput}
                    onChange={(e) => setPaperMaxPerTradeInput(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-right font-bold text-foreground outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Markets</span>
                <select
                  value={paperCategoryInput}
                  onChange={(e) => setPaperCategoryInput(e.target.value)}
                  className="bg-secondary/40 border border-border/60 rounded-lg px-2.5 py-1 text-foreground font-bold text-xs outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Macro">Macro</option>
                  <option value="Tech & AI">Tech & AI</option>
                  <option value="DeFi">DeFi</option>
                </select>
              </div>
            </div>

            {/* Confirm Action Button */}
            <div className="pt-1 space-y-1.5">
              <button
                onClick={() => {
                  const targetWallet = selectedDetailView?.item?.wallet || '0x72F...9A3'
                  if (!followingWallets.includes(targetWallet)) {
                    setFollowingWallets(prev => [...prev, targetWallet])
                  }
                  setShowPaperFollowConfirmation(false)
                  setActiveTab('paper')
                }}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-black text-xs shadow-md transition cursor-pointer"
              >
                Confirm Copy Strategy
              </button>

              <button
                onClick={() => setShowPaperFollowConfirmation(false)}
                className="w-full py-1.5 text-center text-xs font-mono font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}





      {/* ========================================================================= */}
      {/* 5. WALLET PROFILE & QUICK BACKTEST DRAWER (ANALYSIS STAGE) */}
      {/* ========================================================================= */}
      {selectedTraderProfile && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in p-0">
          <div className="absolute inset-0" onClick={() => setSelectedTraderProfile(null)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-border/80 bg-[#121722] text-white p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-600/60 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={() => setSelectedTraderProfile(null)} />

            {/* Profile Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 grid place-items-center text-lg">
                  👑
                </div>
                <div>
                  <h3 className="font-mono text-sm font-extrabold text-white flex items-center gap-1.5">
                    {selectedTraderProfile.ens} <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] font-bold text-emerald-400">
                      High volume
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-[10px] font-bold text-indigo-300">
                      Recently active
                    </span>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedTraderProfile(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions: Follow + Quick Backtest */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleFollow(selectedTraderProfile.wallet)}
                className={cn(
                  "py-2.5 px-3 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
                  followingWallets.includes(selectedTraderProfile.wallet)
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-400"
                    : "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                )}
              >
                {followingWallets.includes(selectedTraderProfile.wallet) ? 'Following ✓' : '+ Follow Trader'}
              </button>

              <button
                onClick={() => setShowQuickBacktestModal(true)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" /> Quick Backtest
              </button>
            </div>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Realized PnL</span>
                <span className="font-extrabold text-emerald-400 text-sm">{selectedTraderProfile.pnl}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ROI %</span>
                <span className="font-extrabold text-sky-400 text-sm">{selectedTraderProfile.roi}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Win Rate</span>
                <span className="font-extrabold text-indigo-400 text-sm">{selectedTraderProfile.winRate}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Smart Money Score</span>
                <span className="font-extrabold text-amber-400 text-sm">{selectedTraderProfile.score}/100</span>
              </div>
            </div>

            {/* Category Strengths Bars */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Category Strengths</span>
              {selectedTraderProfile.categoryStrengths?.map((cs: any, idx: number) => (
                <div key={idx} className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-300">{cs.category}</span>
                    <span className="text-emerald-400 font-bold">{cs.winRate}% Win Rate</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cs.winRate}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Open Exposure */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Current Exposure</span>
              {selectedTraderProfile.exposure?.map((exp: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                  <p className="font-bold text-white leading-tight">{exp.title}</p>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">{exp.side} • {exp.value}</span>
                    <span className="text-sky-400">{exp.pnl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK BACKTEST BOTTOM SHEET MODAL */}
      {/* ========================================================================= */}
      {showQuickBacktestModal && (
        <div className="absolute inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-[2px] animate-fade-in p-0">
          <div className="absolute inset-0" onClick={() => setShowQuickBacktestModal(false)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-indigo-500/60 bg-[#0E131F] text-white p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-600/60 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={() => setShowQuickBacktestModal(false)} />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" /> Quick Backtest Simulation
              </h3>
              <button onClick={() => setShowQuickBacktestModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controls: Time Period, Starting Balance, Copy Size */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Time Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['30D', '90D', 'ALL'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setBacktestTimeframe(tf)}
                      className={cn(
                        "py-2 rounded-xl font-bold transition border cursor-pointer",
                        backtestTimeframe === tf
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Starting Balance</label>
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                    <span className="text-slate-500 mr-1">$</span>
                    <input
                      type="number"
                      value={backtestStartingBalance}
                      onChange={(e) => setBacktestStartingBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent font-bold text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Copy Size</label>
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                    <span className="text-slate-500 mr-1">$</span>
                    <input
                      type="number"
                      value={backtestCopySize}
                      onChange={(e) => setBacktestCopySize(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent font-bold text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Yield Banner */}
            <div className="p-4 rounded-2xl border border-indigo-500/40 bg-indigo-950/40 space-y-2 text-center">
              <span className="text-[11px] text-slate-300 font-semibold">
                If you followed <strong className="text-white">macroking.eth</strong> over past {backtestTimeframe}...
              </span>

              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${(backtestStartingBalance * 1.184).toFixed(0)} <span className="text-xs font-bold">(+18.4%)</span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-indigo-900/60 font-mono text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 block">Est. PnL</span>
                  <span className="font-bold text-emerald-400">+${(backtestStartingBalance * 0.184).toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Max Drawdown</span>
                  <span className="font-bold text-rose-400">-9.2%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Total Trades</span>
                  <span className="font-bold text-white">73</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Win Rate</span>
                  <span className="font-bold text-indigo-300">57%</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
              ⓘ Simulation assumes execution at next available market price. Past performance is not indicative of future results.
            </p>

            <button
              onClick={() => {
                setShowQuickBacktestModal(false)
                setSelectedTraderProfile(null)
                setShowPaperFollowConfirmation(true)
              }}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 transition cursor-pointer"
            >
              Start Paper Copy 🚀
            </button>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* WHALE ALERTS SETTINGS BOTTOM SHEET MODAL (MONITORING STAGE) */}
      {/* ========================================================================= */}
      {showWhaleAlertsSettings && (
        <div className="absolute inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-[2px] animate-fade-in p-0">
          <div className="absolute inset-0" onClick={() => setShowWhaleAlertsSettings(false)} />

          <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-border bg-card text-foreground p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={() => setShowWhaleAlertsSettings(false)} />

            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" /> Whale Alerts Settings
              </h3>
              <button onClick={() => setShowWhaleAlertsSettings(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Whale Alerts</span>
                  <button
                    onClick={() => setWhaleAlertsEnabled(!whaleAlertsEnabled)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                      whaleAlertsEnabled ? "bg-indigo-600" : "bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform",
                      whaleAlertsEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Followed wallets</span>
                  <button
                    onClick={() => setFollowedWalletsAlertsEnabled(!followedWalletsAlertsEnabled)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                      followedWalletsAlertsEnabled ? "bg-indigo-600" : "bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform",
                      followedWalletsAlertsEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* Min Trade Slider */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <div className="flex justify-between font-bold">
                  <span className="uppercase text-[10px] text-muted-foreground">Minimum Trade Threshold</span>
                  <span className="text-indigo-400">${(minTradeThreshold / 1000).toFixed(0)}K</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={minTradeThreshold}
                  onChange={(e) => setMinTradeThreshold(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Min Smart Score */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="uppercase text-[10px] text-muted-foreground">Min Smart Money Score</span>
                  <span className="text-emerald-400">{minSmartScore}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="1"
                  value={minSmartScore}
                  onChange={(e) => setMinSmartScore(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Market Categories */}
              <div className="space-y-1.5 pt-1">
                <span className="uppercase text-[10px] text-muted-foreground font-bold block">Market Categories</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(['All', 'Politics', 'Crypto', 'Macro', 'Sports'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAlertCategory(cat)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-bold transition border shrink-0 cursor-pointer",
                        alertCategory === cat
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-secondary/20 border-border text-muted-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiet Hours & Daily Max */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                <div className="space-y-1">
                  <span className="uppercase text-[10px] text-muted-foreground font-bold block">Quiet hours</span>
                  <span className="font-bold text-foreground block">{quietHours}</span>
                </div>

                <div className="space-y-1">
                  <span className="uppercase text-[10px] text-muted-foreground font-bold block">Daily maximum</span>
                  <span className="font-bold text-foreground block">{dailyMaxAlerts} alerts</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowWhaleAlertsSettings(false)}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md transition cursor-pointer mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
