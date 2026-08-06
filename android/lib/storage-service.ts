// RetroPick-Android Local Storage & Offline Persistence Service
// Aligned with STATE_DATA_OFFLINE_AND_REALTIME.md

const STORAGE_KEYS = {
  BALANCE: 'retropick_user_balance',
  POSITIONS: 'retropick_user_positions',
  ACTIVITY: 'retropick_user_activity',
  NOTIFICATIONS: 'retropick_user_notifications',
  MARKETS_CACHE: 'retropick_markets_cache',
  AUTH: 'retropick_auth_state',
}

export function loadStoredData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (err) {
    console.warn(`Failed to read ${key} from localStorage:`, err)
    return fallback
  }
}

export function saveStoredData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`Failed to save ${key} to localStorage:`, err)
  }
}

export const StorageService = {
  getKeys: () => STORAGE_KEYS,

  loadBalance: (fallback = 1240.50): number => 
    loadStoredData(STORAGE_KEYS.BALANCE, fallback),

  saveBalance: (balance: number) => 
    saveStoredData(STORAGE_KEYS.BALANCE, balance),

  loadPositions: (fallback: any[] = []): any[] => 
    loadStoredData(STORAGE_KEYS.POSITIONS, fallback),

  savePositions: (positions: any[]) => 
    saveStoredData(STORAGE_KEYS.POSITIONS, positions),

  loadActivity: (fallback: any[] = []): any[] => 
    loadStoredData(STORAGE_KEYS.ACTIVITY, fallback),

  saveActivity: (activity: any[]) => 
    saveStoredData(STORAGE_KEYS.ACTIVITY, activity),

  loadNotifications: (fallback: any[] = []): any[] => 
    loadStoredData(STORAGE_KEYS.NOTIFICATIONS, fallback),

  saveNotifications: (notifs: any[]) => 
    saveStoredData(STORAGE_KEYS.NOTIFICATIONS, notifs),

  loadMarketsCache: (fallback: any[] = []): any[] => 
    loadStoredData(STORAGE_KEYS.MARKETS_CACHE, fallback),

  saveMarketsCache: (markets: any[]) => 
    saveStoredData(STORAGE_KEYS.MARKETS_CACHE, markets),

  loadAuth: (fallback = { authenticated: false, walletConnected: false, address: '', provider: '', email: '' }) => 
    loadStoredData(STORAGE_KEYS.AUTH, fallback),

  saveAuth: (auth: { authenticated: boolean; walletConnected: boolean; address: string; provider: string; email: string }) => 
    saveStoredData(STORAGE_KEYS.AUTH, auth),
}
