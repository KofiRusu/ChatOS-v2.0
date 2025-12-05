'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTradingStore } from '@/stores/trading-store'
import { Loader2 } from 'lucide-react'

interface OrderBookProps {
  symbol: string
}

interface OrderBookLevel {
  price: number
  size: number
  total: number
}

interface OrderBookData {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
  timestamp: number
}

// Number of levels to show on each side (compact to fit in panel)
const LEVELS_TO_SHOW = 6

export function OrderBook({ symbol }: OrderBookProps) {
  const { markets } = useTradingStore()
  const [orderbook, setOrderbook] = useState<OrderBookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentMarket = markets.find(m => m.symbol === symbol)
  const storePrice = currentMarket?.price || 0

  const fetchOrderBook = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        action: 'orderbook',
        exchange: 'binance',
        symbol: symbol.replace('USDT', '/USDT'),
      })
      
      const response = await fetch(`/api/market?${params}`)
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      // Process the data - calculate running totals
      let askTotal = 0
      let bidTotal = 0
      
      // Take only the levels closest to the spread
      const asks = (data.asks || []).slice(0, LEVELS_TO_SHOW).map((level: { price: number; size: number }) => {
        askTotal += level.size
        return { price: level.price, size: level.size, total: askTotal }
      })
      
      const bids = (data.bids || []).slice(0, LEVELS_TO_SHOW).map((level: { price: number; size: number }) => {
        bidTotal += level.size
        return { price: level.price, size: level.size, total: bidTotal }
      })
      
      setOrderbook({
        asks: asks.reverse(), // Reverse so lowest asks are at bottom (closest to spread)
        bids,
        timestamp: data.timestamp || Date.now(),
      })
      setError(null)
    } catch (err: any) {
      console.error('Error fetching order book:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [symbol])

  // Fetch on mount and every 2 seconds
  useEffect(() => {
    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 2000)
    return () => clearInterval(interval)
  }, [fetchOrderBook])

  const maxTotal = useMemo(() => {
    if (!orderbook) return 0
    return Math.max(
      orderbook.asks[0]?.total || 0,
      orderbook.bids[orderbook.bids.length - 1]?.total || 0
    )
  }, [orderbook])

  const spread = useMemo(() => {
    if (!orderbook || orderbook.asks.length === 0 || orderbook.bids.length === 0) return 0
    return orderbook.asks[orderbook.asks.length - 1]?.price - orderbook.bids[0]?.price
  }, [orderbook])

  const midPrice = useMemo(() => {
    if (!orderbook || orderbook.asks.length === 0 || orderbook.bids.length === 0) return storePrice
    return (orderbook.asks[orderbook.asks.length - 1]?.price + orderbook.bids[0]?.price) / 2
  }, [orderbook, storePrice])

  if (loading && !orderbook) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !orderbook) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-red-400 p-4 text-center">
        {error}
      </div>
    )
  }

  if (!orderbook) return null

  return (
    <div className="h-full flex flex-col text-[10px] overflow-hidden">
      {/* Header */}
      <div className="flex justify-between px-2 py-1 text-gray-500 font-medium border-b border-gray-800 shrink-0">
        <span className="flex-1">Price</span>
        <span className="w-14 text-right">Size</span>
        <span className="w-12 text-right">Total</span>
      </div>

      {/* Asks (Sells) */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {orderbook.asks.map((ask, i) => (
          <div key={i} className="relative flex justify-between px-2 py-px hover:bg-gray-800/50">
            <div 
              className="absolute inset-0 bg-red-500/10" 
              style={{ width: `${(ask.total / maxTotal) * 100}%`, right: 0, left: 'auto' }}
            />
            <span className="relative text-red-400 font-mono flex-1">${ask.price.toFixed(2)}</span>
            <span className="relative text-gray-400 font-mono w-14 text-right">{ask.size.toFixed(4)}</span>
            <span className="relative text-gray-500 font-mono w-12 text-right">{ask.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Spread - always visible */}
      <div className="px-2 py-1 bg-gray-900/50 border-y border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-white">${midPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-gray-500 text-[9px]">Spread: ${spread.toFixed(2)}</span>
        </div>
      </div>

      {/* Bids (Buys) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {orderbook.bids.map((bid, i) => (
          <div key={i} className="relative flex justify-between px-2 py-px hover:bg-gray-800/50">
            <div 
              className="absolute inset-0 bg-green-500/10" 
              style={{ width: `${(bid.total / maxTotal) * 100}%`, right: 0, left: 'auto' }}
            />
            <span className="relative text-green-400 font-mono flex-1">${bid.price.toFixed(2)}</span>
            <span className="relative text-gray-400 font-mono w-14 text-right">{bid.size.toFixed(4)}</span>
            <span className="relative text-green-500 font-mono w-12 text-right">{bid.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
