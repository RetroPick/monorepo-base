'use client'

import { useState } from 'react'
import {
  TrendingUp,
  Bitcoin,
  TrendingDown,
  Banknote,
  Trophy,
  Zap,
  Brain,
  Cloud,
  Settings,
  Info,
  HelpCircle,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Wallet,
} from 'lucide-react'
import { Logo } from './logo'
import { SearchBar } from './ui-bits'
import { MARKETS } from '@/lib/retropick-data'

const CATEGORIES = [
  {
    label: 'Trending',
    icon: TrendingUp,
    subCategories: [
      { label: 'Bitcoin', value: 'BTC' },
      { label: 'Fed', value: 'fed' },
      { label: 'XRP', value: 'XRP' },
    ],
  },
  {
    label: 'Crypto',
    icon: Bitcoin,
    subCategories: [
      { label: 'Bitcoin', value: 'BTC' },
      { label: 'XRP', value: 'XRP' },
    ],
  },
  {
    label: 'Economics',
    icon: TrendingDown,
    subCategories: [
      { label: 'Inflation', value: 'inflation' },
      { label: 'Growth', value: 'growth' },
      { label: 'Fed', value: 'fed' },
    ],
  },
  {
    label: 'Financials',
    icon: Banknote,
    subCategories: [
      { label: 'Stocks', value: 'stocks' },
      { label: 'Bonds', value: 'bonds' },
      { label: 'Banking', value: 'banking' },
    ],
  },
  {
    label: 'Sport',
    icon: Trophy,
    subCategories: [
      { label: 'Football', value: 'football' },
      { label: 'F1', value: 'f1' },
      { label: 'Tennis', value: 'tennis' },
    ],
  },
  {
    label: 'Tech & Science',
    icon: Zap,
    subCategories: [
      { label: 'AI', value: 'ai' },
      { label: 'Space', value: 'space' },
      { label: 'Tech', value: 'tech' },
    ],
  },
  {
    label: 'AI',
    icon: Brain,
    subCategories: [
      { label: 'GPT', value: 'gpt' },
      { label: 'ML Models', value: 'ml' },
    ],
  },
  {
    label: 'Climate',
    icon: Cloud,
    subCategories: [
      { label: 'Temperature', value: 'temperature' },
      { label: 'Emissions', value: 'emissions' },
    ],
  },
]

const MORE = [
  { label: 'Settings', icon: Settings },
  { label: 'About RetroPick', icon: Info },
  { label: 'Help', icon: HelpCircle },
]

export function DrawerMenu({
  open,
  onClose,
  dark,
  onToggleTheme,
  onSubCategoryClick,
  onNavigatePortfolio,
  walletConnected,
  walletAddress,
  walletProvider,
  userEmail,
  onConnect,
  onDisconnect,
}: {
  open: boolean
  onClose: () => void
  dark: boolean
  onToggleTheme: () => void
  onSubCategoryClick?: (value: string) => void
  onNavigatePortfolio?: () => void
  walletConnected: boolean
  walletAddress: string
  walletProvider: string
  userEmail?: string
  onConnect: () => void
  onDisconnect: () => void
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const toggleCategory = (label: string) => {
    setExpandedCategory(expandedCategory === label ? null : label)
  }

  const getMarketsForCategory = (category: string) => {
    if (category === 'Trending') {
      return MARKETS.slice(0, 6)
    }
    if (category === 'Bitcoin') {
      return MARKETS.filter(m => m.icon === 'BTC').slice(0, 3)
    }
    if (category === 'XRP') {
      return MARKETS.filter(m => m.icon === 'XRP').slice(0, 3)
    }
    const categoryMap: Record<string, string[]> = {
      'Crypto': ['Crypto'],
      'Economics': ['Economics'],
      'Financials': ['Finance'],
      'Sport': ['Sports'],
      'Tech & Science': ['Tech', 'Science'],
      'AI': ['AI'],
      'Climate': ['Climate'],
    }
    const mappedCategories = categoryMap[category]
    if (!mappedCategories) return []
    return MARKETS.filter(m => mappedCategories.includes(m.category)).slice(0, 6)
  }

  return (
    <div
      className={`absolute inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        className={`absolute left-0 top-0 bottom-[72px] flex w-[82%] max-w-[300px] flex-col border-r border-border bg-popover transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-3 border-b border-border px-5 pb-4 pt-6">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display text-lg font-bold text-foreground">
              RetroPick
            </span>
          </div>
          <SearchBar placeholder="Search markets..." />
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
          {/* User Profile Section */}
          <div className="space-y-1.5">
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              User Profile
            </p>
            {walletConnected ? (
              <div className="rounded-[12px] border border-border bg-secondary/15 p-3.5 mx-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Identity</span>
                  <span className="text-[9px] uppercase font-mono bg-primary/15 text-primary px-2 py-0.5 rounded font-black tracking-wide">
                    {walletProvider === 'google' ? 'Google 🔑' : 
                     walletProvider === 'telegram' ? 'Telegram ✉️' :
                     walletProvider === 'twitter' ? 'Twitter 𝕏' :
                     walletProvider === 'apple' ? 'Apple 🍏' :
                     walletProvider === 'email' ? 'Email ✉️' : walletProvider}
                  </span>
                </div>
                
                {userEmail && userEmail !== 'external-wallet' && (
                  <p className="text-xs font-bold text-foreground truncate select-all">{userEmail}</p>
                )}
                
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Embedded Wallet</span>
                  <p className="text-[10px] font-mono text-muted-foreground truncate select-all">{walletAddress}</p>
                </div>

                <button
                  onClick={() => {
                    onDisconnect()
                    onClose()
                  }}
                  className="w-full text-center rounded-[8px] bg-no-soft border border-no/20 py-1.5 text-[10px] font-bold text-no hover:bg-no/20 active:scale-[0.98] transition-all"
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onConnect()
                  onClose()
                }}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-primary font-bold transition-colors active:bg-accent hover:bg-accent/50"
              >
                <Wallet className="h-5 w-5 shrink-0" />
                <span className="text-sm">Connect Wallet</span>
              </button>
            )}
            <button
              onClick={() => {
                onNavigatePortfolio?.()
                onClose()
              }}
              className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 transition-colors active:bg-accent hover:bg-accent/50"
            >
              <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">Portfolio</span>
            </button>
          </div>

          <p className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Categories
          </p>
          {CATEGORIES.map((c) => {
            const isExpanded = expandedCategory === c.label
            const hasSubCategories = c.subCategories && c.subCategories.length > 0
            return (
              <div key={c.label}>
                <button
                  onClick={() => hasSubCategories && toggleCategory(c.label)}
                  className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 transition-colors active:bg-accent"
                >
                  <span className="flex items-center gap-3 flex-1">
                    <c.icon className="h-[18px] w-[18px] text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{c.label}</span>
                  </span>
                  {hasSubCategories && (
                    isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {isExpanded && hasSubCategories && (
                  <div className="space-y-1 pl-6 pb-2">
                    {c.subCategories.map((sub) => (
                      <button
                        key={sub.value}
                        onClick={() => {
                          onSubCategoryClick?.(sub.value)
                          onClose()
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/50 rounded-[8px] transition-colors"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 transition-colors active:bg-accent"
          >
            <span className="flex items-center gap-3">
              {dark ? (
                <Moon className="h-[18px] w-[18px] text-primary" />
              ) : (
                <Sun className="h-[18px] w-[18px] text-primary" />
              )}
              <span className="text-sm font-medium text-foreground">Theme</span>
            </span>
            <span
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                dark ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  dark ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>

          {MORE.map((c) => (
            <MenuItem key={c.label} icon={c.icon} label={c.label} />
          ))}
        </div>
      </aside>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <button className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors active:bg-accent">
      <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  )
}
