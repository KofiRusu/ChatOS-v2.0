'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useTradingStore } from '@/stores/trading-store'

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT']
const REFRESH_INTERVAL = 5000 // 5 seconds

/**
 * Hook to fetch and update live prices from CCXT
 * This populates the trading store with real market data
 */
export function useLivePrices() {
  const { updateAllMarketPrices, initializeMockData, markets } = useTradingStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const initializedRef = useRef(false)

  const fetchPrices = useCallback(async () => {
    try {
      // Fetch tickers for all symbols in parallel
      const promises = SYMBOLS.map(async (symbol) => {
        const params = new URLSearchParams({
          action: 'ticker',
          exchange: 'binance',
          symbol,
        })
        
        const response = await fetch(`/api/market?${params}`)
        if (!response.ok) throw new Error(`Failed to fetch ${symbol}`)
        
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        
        return {
          symbol: symbol.replace('/', ''), // Convert BTC/USDT to BTCUSDT
          price: data.last || 0,
          change24h: data.change || 0,
          volume24h: data.volume || 0,
          high24h: data.high || 0,
          low24h: data.low || 0,
        }
      })

      const results = await Promise.allSettled(promises)
      const prices = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value)
      
      if (prices.length > 0) {
        updateAllMarketPrices(prices)
      }
    } catch (error) {
      console.error('Error fetching live prices:', error)
    }
  }, [updateAllMarketPrices])

  useEffect(() => {
    // Initialize mock data structure if not already done
    if (!initializedRef.current) {
      initializeMockData()
      initializedRef.current = true
    }
    
    // Fetch prices immediately
    fetchPrices()
    
    // Set up interval for continuous updates
    intervalRef.current = setInterval(fetchPrices, REFRESH_INTERVAL)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchPrices, initializeMockData])

  return { refetch: fetchPrices }
}

