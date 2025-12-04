'use client'

import { useEffect, useRef, useState } from 'react'
import { useRealtime, realtimeWS, RealtimeTrade, Liquidation } from '@/lib/trading/realtime-ws'
import { Wifi, WifiOff, Zap, Skull, TrendingUp, TrendingDown, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TradeFeedProps {
  symbol?: string
  showWhalesOnly?: boolean
  showLiquidations?: boolean
  maxItems?: number
}

export function TradeFeed({ 
  symbol, 
  showWhalesOnly = false, 
  showLiquidations = true,
  maxItems = 50 
}: TradeFeedProps) {
  const { connected, trades, liquidations, whaleTrades, stats, connect } = useRealtime()
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Connect on mount
  useEffect(() => {
    const symbols = symbol 
      ? [symbol.replace('/', '').toLowerCase()]
      : ['btcusdt', 'ethusdt', 'solusdt']
    connect(symbols)
  }, [symbol, connect])

  // Initialize audio for whale alerts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/whale-alert.mp3')
      audioRef.current.volume = 0.5
    }
  }, [])

  // Play sound on whale trades
  useEffect(() => {
    if (soundEnabled && whaleTrades.length > 0 && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [whaleTrades.length, soundEnabled])

  // Filter trades
  const displayTrades = showWhalesOnly 
    ? whaleTrades.slice(0, maxItems)
    : trades.filter(t => !symbol || t.symbol.includes(symbol.replace('/', ''))).slice(0, maxItems)

  const displayLiquidations = liquidations
    .filter(l => !symbol || l.symbol.includes(symbol.replace('/', '')))
    .slice(0, 20)

  // Format USD value
  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col bg-[#0d0d12] rounded-lg border border-gray-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-200">Live Feed</span>
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
            connected 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1 rounded ${soundEnabled ? 'text-yellow-400' : 'text-gray-500'}`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800/30 bg-black/30">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-green-400">
            Buy: {formatUsd(stats.buyVolume)}
          </span>
          <span className="text-red-400">
            Sell: {formatUsd(stats.sellVolume)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>🐋 {stats.largeTradesCount}</span>
          <span>💀 {stats.liquidationsCount}</span>
        </div>
      </div>

      {/* Trade feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
        <AnimatePresence mode="popLayout">
          {/* Liquidations */}
          {showLiquidations && displayLiquidations.map((liq) => (
            <motion.div
              key={liq.id}
              initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
              animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(239, 68, 68, 0)' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800/20"
            >
              <div className="flex items-center gap-2">
                <Skull className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[11px] font-medium text-gray-200">
                  {liq.symbol}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  liq.side === 'long'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {liq.side.toUpperCase()} LIQ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-red-400">
                  {formatUsd(liq.valueUsd)}
                </span>
                <span className="text-[10px] text-gray-600">
                  {formatTime(liq.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Trades */}
          {displayTrades.map((trade) => (
            <motion.div
              key={trade.id}
              initial={{ 
                opacity: 0, 
                x: -20, 
                backgroundColor: trade.isWhale 
                  ? 'rgba(168, 85, 247, 0.3)' 
                  : trade.side === 'buy' 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'rgba(239, 68, 68, 0.2)'
              }}
              animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center justify-between px-2 py-1 border-b border-gray-800/20 ${
                trade.isWhale ? 'bg-purple-500/5' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {trade.isWhale ? (
                  <span className="text-lg">🐋</span>
                ) : trade.side === 'buy' ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className="text-[10px] text-gray-400">{trade.exchange}</span>
                <span className="text-[11px] font-medium text-gray-200">
                  {trade.symbol.replace('USDT', '')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono ${
                  trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${trade.price.toFixed(2)}
                </span>
                <span className={`text-[10px] font-mono ${
                  trade.isWhale ? 'text-purple-400 font-bold' : trade.isLarge ? 'text-yellow-400' : 'text-gray-500'
                }`}>
                  {formatUsd(trade.price * trade.amount)}
                </span>
                <span className="text-[9px] text-gray-600 w-14 text-right">
                  {formatTime(trade.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {displayTrades.length === 0 && !connected && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <WifiOff className="w-6 h-6 mb-2" />
            <span className="text-xs">Connecting to live feed...</span>
          </div>
        )}
      </div>

      {/* Footer with CVD */}
      {stats.buyVolume + stats.sellVolume > 0 && (
        <div className="px-2 py-1.5 border-t border-gray-800/50 bg-black/30">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">CVD (Volume Delta)</span>
            <span className={stats.buyVolume > stats.sellVolume ? 'text-green-400' : 'text-red-400'}>
              {stats.buyVolume > stats.sellVolume ? '+' : ''}
              {formatUsd(stats.buyVolume - stats.sellVolume)}
            </span>
          </div>
          {/* CVD Bar */}
          <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                stats.buyVolume > stats.sellVolume ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{
                width: `${(stats.buyVolume / (stats.buyVolume + stats.sellVolume)) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for sidebar
export function TradeFeedMini({ symbol }: { symbol?: string }) {
  return (
    <div className="h-48">
      <TradeFeed symbol={symbol} showWhalesOnly maxItems={10} />
    </div>
  )
}

