import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type Exchange = 'binance' | 'bybit' | 'hyperliquid' | 'coinbase' | 'paper'

export type AccountType = 'spot' | 'futures' | 'margin' | 'paper'

export type OrderSide = 'buy' | 'sell'

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'

export type TradingMode = 'view' | 'paper' | 'live'

export interface ExchangeAccount {
  id: string
  exchange: Exchange
  name: string
  type: AccountType
  balance: number
  currency: string
  connected: boolean
  apiKeySet: boolean
}

export interface MarketSymbol {
  symbol: string
  baseAsset: string
  quoteAsset: string
  exchange: Exchange
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
}

export interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  leverage: number
  stopLoss?: number
  takeProfit?: number
  strategy?: string
  openedAt: string
}

export interface Order {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  size: number
  price?: number
  stopPrice?: number
  status: 'pending' | 'filled' | 'cancelled' | 'rejected'
  createdAt: string
  filledAt?: string
}

export interface PortfolioStats {
  totalValue: number
  dayPnl: number
  dayPnlPercent: number
  weekPnl: number
  monthPnl: number
  maxDrawdown: number
  winRate: number
  totalTrades: number
}

export interface WatchlistItem {
  symbol: string
  name: string
  price: number
  change24h: number
}

export interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  timestamp: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  symbols: string[]
}

export interface JournalEntry {
  id: string
  type: 'trade' | 'note' | 'analysis'
  title: string
  content: string
  symbols: string[]
  tradeId?: string
  createdAt: string
  tags: string[]
}

// =============================================================================
// Store State
// =============================================================================

interface TradingState {
  // Connection state
  accounts: ExchangeAccount[]
  currentAccountId: string | null
  mode: TradingMode
  
  // Market state
  currentSymbol: string
  watchlists: { [key: string]: WatchlistItem[] }
  markets: MarketSymbol[]
  
  // Trading state
  positions: Position[]
  orders: Order[]
  
  // Portfolio
  portfolio: PortfolioStats
  
  // News & sentiment
  news: NewsItem[]
  
  // Journal
  journal: JournalEntry[]
  
  // UI state
  selectedTab: 'markets' | 'portfolio' | 'journal'
  rightPanelTab: 'assistant' | 'news' | 'sentiment' | 'alerts'
  isLabOpen: boolean
  
  // Actions
  setCurrentAccount: (accountId: string) => void
  setMode: (mode: TradingMode) => void
  setCurrentSymbol: (symbol: string) => void
  setSelectedTab: (tab: 'markets' | 'portfolio' | 'journal') => void
  setRightPanelTab: (tab: 'assistant' | 'news' | 'sentiment' | 'alerts') => void
  setLabOpen: (open: boolean) => void
  
  // Trading actions
  addPosition: (position: Omit<Position, 'id'>) => void
  closePosition: (positionId: string, exitPrice: number) => void
  updatePosition: (positionId: string, updates: Partial<Position>) => void
  
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => void
  cancelOrder: (orderId: string) => void
  
  // Journal actions
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void
  
  // Exchange actions
  connectExchange: (exchange: Exchange, apiKey: string, secret: string) => Promise<boolean>
  disconnectExchange: (accountId: string) => void
  
  // Price updates from CCXT
  updateMarketPrice: (symbol: string, price: number, change24h: number, volume24h?: number, high24h?: number, low24h?: number) => void
  updateAllMarketPrices: (prices: { symbol: string; price: number; change24h: number; volume24h?: number; high24h?: number; low24h?: number }[]) => void
  
  // Mock data
  initializeMockData: () => void
}

// =============================================================================
// Mock Data
// =============================================================================

const mockAccounts: ExchangeAccount[] = [
  {
    id: 'paper-main',
    exchange: 'paper',
    name: 'Paper Trading',
    type: 'paper',
    balance: 100000,
    currency: 'USDT',
    connected: true,
    apiKeySet: false,
  },
]

// Initial placeholder markets - prices will be updated from CCXT
const mockMarkets: MarketSymbol[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', exchange: 'binance', price: 0, change24h: 0, volume24h: 0, high24h: 0, low24h: 0 },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', exchange: 'binance', price: 0, change24h: 0, volume24h: 0, high24h: 0, low24h: 0 },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', exchange: 'binance', price: 0, change24h: 0, volume24h: 0, high24h: 0, low24h: 0 },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', exchange: 'binance', price: 0, change24h: 0, volume24h: 0, high24h: 0, low24h: 0 },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', exchange: 'binance', price: 0, change24h: 0, volume24h: 0, high24h: 0, low24h: 0 },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', exchange: 'binance', price: 0, change24h: 0, volume24h: 0, high24h: 0, low24h: 0 },
]

// Watchlist names - prices populated from CCXT
const mockWatchlists = {
  favorites: [
    { symbol: 'BTCUSDT', name: 'Bitcoin', price: 0, change24h: 0 },
    { symbol: 'ETHUSDT', name: 'Ethereum', price: 0, change24h: 0 },
    { symbol: 'SOLUSDT', name: 'Solana', price: 0, change24h: 0 },
  ],
  crypto: [
    { symbol: 'BTCUSDT', name: 'Bitcoin', price: 0, change24h: 0 },
    { symbol: 'ETHUSDT', name: 'Ethereum', price: 0, change24h: 0 },
    { symbol: 'SOLUSDT', name: 'Solana', price: 0, change24h: 0 },
    { symbol: 'BNBUSDT', name: 'BNB', price: 0, change24h: 0 },
    { symbol: 'XRPUSDT', name: 'XRP', price: 0, change24h: 0 },
  ],
}

// Positions - current price updated from CCXT
const mockPositions: Position[] = []

const mockNews: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Bitcoin ETF inflows reach $500M in single day',
    source: 'CoinDesk',
    url: '#',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    sentiment: 'bullish',
    symbols: ['BTCUSDT'],
  },
  {
    id: 'news-2',
    title: 'Ethereum upgrade scheduled for Q1 2025',
    source: 'The Block',
    url: '#',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    sentiment: 'bullish',
    symbols: ['ETHUSDT'],
  },
  {
    id: 'news-3',
    title: 'Fed signals potential rate cuts in 2025',
    source: 'Bloomberg',
    url: '#',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    sentiment: 'bullish',
    symbols: ['BTCUSDT', 'ETHUSDT'],
  },
  {
    id: 'news-4',
    title: 'Solana network processes 50K TPS in stress test',
    source: 'Decrypt',
    url: '#',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    sentiment: 'bullish',
    symbols: ['SOLUSDT'],
  },
]

const mockPortfolio: PortfolioStats = {
  totalValue: 101250,
  dayPnl: 1250,
  dayPnlPercent: 1.25,
  weekPnl: 3500,
  monthPnl: 8200,
  maxDrawdown: -5.2,
  winRate: 62,
  totalTrades: 47,
}

// =============================================================================
// Store
// =============================================================================

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      // Initial state
      accounts: [],
      currentAccountId: null,
      mode: 'paper',
      currentSymbol: 'BTCUSDT',
      watchlists: {},
      markets: [],
      positions: [],
      orders: [],
      portfolio: {
        totalValue: 0,
        dayPnl: 0,
        dayPnlPercent: 0,
        weekPnl: 0,
        monthPnl: 0,
        maxDrawdown: 0,
        winRate: 0,
        totalTrades: 0,
      },
      news: [],
      journal: [],
      selectedTab: 'markets',
      rightPanelTab: 'assistant',
      isLabOpen: false,

      // Actions
      setCurrentAccount: (accountId) => set({ currentAccountId: accountId }),
      setMode: (mode) => set({ mode }),
      setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      setLabOpen: (open) => set({ isLabOpen: open }),

      addPosition: (position) => {
        const id = `pos-${Date.now()}`
        const newPosition: Position = {
          ...position,
          id,
        }
        set((state) => ({
          positions: [...state.positions, newPosition],
        }))
        
        // Auto-create journal entry
        get().addJournalEntry({
          type: 'trade',
          title: `Opened ${position.side.toUpperCase()} ${position.symbol}`,
          content: `Entry: $${position.entryPrice}, Size: ${position.size}, SL: ${position.stopLoss || 'None'}, TP: ${position.takeProfit || 'None'}`,
          symbols: [position.symbol],
          tradeId: id,
          tags: ['trade', position.side],
        })
      },

      closePosition: (positionId, exitPrice) => {
        const position = get().positions.find((p) => p.id === positionId)
        if (!position) return

        const pnl = position.side === 'long'
          ? (exitPrice - position.entryPrice) * position.size
          : (position.entryPrice - exitPrice) * position.size

        set((state) => ({
          positions: state.positions.filter((p) => p.id !== positionId),
        }))

        // Auto-create journal entry
        get().addJournalEntry({
          type: 'trade',
          title: `Closed ${position.side.toUpperCase()} ${position.symbol}`,
          content: `Exit: $${exitPrice}, PnL: $${pnl.toFixed(2)} (${((pnl / (position.entryPrice * position.size)) * 100).toFixed(2)}%)`,
          symbols: [position.symbol],
          tradeId: positionId,
          tags: ['trade', 'closed', pnl > 0 ? 'win' : 'loss'],
        })
      },

      updatePosition: (positionId, updates) => {
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === positionId ? { ...p, ...updates } : p
          ),
        }))
      },

      addOrder: (order) => {
        const id = `order-${Date.now()}`
        const newOrder: Order = {
          ...order,
          id,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          orders: [...state.orders, newOrder],
        }))
      },

      cancelOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'cancelled' } : o
          ),
        }))
      },

      addJournalEntry: (entry) => {
        const id = `journal-${Date.now()}`
        const newEntry: JournalEntry = {
          ...entry,
          id,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          journal: [newEntry, ...state.journal],
        }))
      },

      connectExchange: async (exchange, apiKey, secret) => {
        // Mock connection - in reality would call API
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        const newAccount: ExchangeAccount = {
          id: `${exchange}-${Date.now()}`,
          exchange,
          name: `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} Spot`,
          type: 'spot',
          balance: 10000,
          currency: 'USDT',
          connected: true,
          apiKeySet: true,
        }
        
        set((state) => ({
          accounts: [...state.accounts, newAccount],
          currentAccountId: newAccount.id,
        }))
        
        return true
      },

      disconnectExchange: (accountId) => {
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== accountId),
          currentAccountId: state.currentAccountId === accountId
            ? state.accounts[0]?.id || null
            : state.currentAccountId,
        }))
      },

      // Update single market price from CCXT
      updateMarketPrice: (symbol, price, change24h, volume24h, high24h, low24h) => {
        set((state) => ({
          markets: state.markets.map((m) =>
            m.symbol === symbol
              ? { ...m, price, change24h, volume24h: volume24h ?? m.volume24h, high24h: high24h ?? m.high24h, low24h: low24h ?? m.low24h }
              : m
          ),
          watchlists: Object.fromEntries(
            Object.entries(state.watchlists).map(([key, items]) => [
              key,
              items.map((item) =>
                item.symbol === symbol ? { ...item, price, change24h } : item
              ),
            ])
          ),
          // Also update position current prices
          positions: state.positions.map((p) => {
            if (p.symbol === symbol) {
              const pnl = p.side === 'long'
                ? (price - p.entryPrice) * p.size
                : (p.entryPrice - price) * p.size
              const pnlPercent = (pnl / (p.entryPrice * p.size)) * 100
              return { ...p, currentPrice: price, pnl, pnlPercent }
            }
            return p
          }),
        }))
      },

      // Batch update all market prices
      updateAllMarketPrices: (prices) => {
        const priceMap = new Map(prices.map((p) => [p.symbol, p]))
        set((state) => ({
          markets: state.markets.map((m) => {
            const update = priceMap.get(m.symbol)
            if (update) {
              return {
                ...m,
                price: update.price,
                change24h: update.change24h,
                volume24h: update.volume24h ?? m.volume24h,
                high24h: update.high24h ?? m.high24h,
                low24h: update.low24h ?? m.low24h,
              }
            }
            return m
          }),
          watchlists: Object.fromEntries(
            Object.entries(state.watchlists).map(([key, items]) => [
              key,
              items.map((item) => {
                const update = priceMap.get(item.symbol)
                return update ? { ...item, price: update.price, change24h: update.change24h } : item
              }),
            ])
          ),
          positions: state.positions.map((p) => {
            const update = priceMap.get(p.symbol)
            if (update) {
              const price = update.price
              const pnl = p.side === 'long'
                ? (price - p.entryPrice) * p.size
                : (p.entryPrice - price) * p.size
              const pnlPercent = (pnl / (p.entryPrice * p.size)) * 100
              return { ...p, currentPrice: price, pnl, pnlPercent }
            }
            return p
          }),
        }))
      },

      initializeMockData: () => {
        set({
          accounts: mockAccounts,
          currentAccountId: 'paper-main',
          markets: mockMarkets,
          watchlists: mockWatchlists,
          positions: mockPositions,
          portfolio: mockPortfolio,
          news: mockNews,
        })
      },
    }),
    {
      name: 'trading-store',
      partialize: (state) => ({
        currentAccountId: state.currentAccountId,
        currentSymbol: state.currentSymbol,
        mode: state.mode,
        watchlists: state.watchlists,
        journal: state.journal,
      }),
    }
  )
)

