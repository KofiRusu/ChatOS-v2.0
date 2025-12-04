'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTradingStore } from '@/stores/trading-store'
import { useMarketData } from '@/hooks/use-market-data'
import { useRealtime, realtimeWS } from '@/lib/trading/realtime-ws'
import { 
  calculateIchimoku, 
  calculateFutureCloud, 
  analyzeIchimokuSignals,
  IchimokuData,
  DEFAULT_ICHIMOKU_CONFIG 
} from '@/lib/trading/indicators/ichimoku'
import { Loader2, Wifi, WifiOff, RefreshCw, CloudRain, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TradingChartProps {
  symbol: string
}

// Ichimoku colors
const ICHIMOKU_COLORS = {
  tenkanSen: '#2563eb',    // Blue - Conversion Line
  kijunSen: '#dc2626',     // Red - Base Line
  senkouSpanA: '#22c55e',  // Green - Leading Span A
  senkouSpanB: '#ef4444',  // Red - Leading Span B
  cloudBullish: 'rgba(34, 197, 94, 0.15)',   // Green cloud
  cloudBearish: 'rgba(239, 68, 68, 0.15)',   // Red cloud
  chikouSpan: '#a855f7',   // Purple - Lagging Span
}

export function TradingChart({ symbol }: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { positions } = useTradingStore()
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })
  const [timeframe, setTimeframe] = useState('1h')
  const [useLiveData, setUseLiveData] = useState(true)
  const [showIchimoku, setShowIchimoku] = useState(true)

  // Real-time data
  const { connected, trades, getPrice } = useRealtime()
  const realtimePrice = getPrice(symbol)

  // Use CCXT data hook
  const { 
    candles, 
    ticker, 
    loading, 
    error, 
    lastUpdate,
    refetchCandles 
  } = useMarketData({
    symbol,
    timeframe,
    refreshInterval: 10000,
    enableLiveUpdates: useLiveData,
  })

  // Connect to WebSocket on mount
  useEffect(() => {
    realtimeWS.connect([symbol.replace('/', '').toLowerCase()])
    return () => {
      // Don't disconnect on unmount to keep other components connected
    }
  }, [symbol])

  // Use real CCXT data - no mock fallback for accurate charting
  const chartCandles = candles

  // Calculate Ichimoku indicators
  const ichimokuData = useMemo(() => {
    if (!showIchimoku || chartCandles.length < 52) return []
    return calculateIchimoku(chartCandles, DEFAULT_ICHIMOKU_CONFIG)
  }, [chartCandles, showIchimoku])

  // Calculate future cloud projection
  const futureCloud = useMemo(() => {
    if (!showIchimoku || chartCandles.length < 52) return []
    return calculateFutureCloud(chartCandles, DEFAULT_ICHIMOKU_CONFIG)
  }, [chartCandles, showIchimoku])

  // Analyze Ichimoku signals
  const ichimokuSignal = useMemo(() => {
    if (!showIchimoku || ichimokuData.length === 0) return null
    return analyzeIchimokuSignals(chartCandles, ichimokuData)
  }, [chartCandles, ichimokuData, showIchimoku])

  // Handle resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || chartCandles.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = dimensions
    const dpr = window.devicePixelRatio || 1

    // Set canvas size with DPR
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, width, height)

    // Calculate price range (include Ichimoku values)
    const allPrices = chartCandles.flatMap(c => [c.high, c.low])
    if (showIchimoku && ichimokuData.length > 0) {
      ichimokuData.forEach(ichi => {
        if (ichi.cloudTop) allPrices.push(ichi.cloudTop)
        if (ichi.cloudBottom) allPrices.push(ichi.cloudBottom)
        if (ichi.tenkanSen) allPrices.push(ichi.tenkanSen)
        if (ichi.kijunSen) allPrices.push(ichi.kijunSen)
      })
      futureCloud.forEach(fc => {
        if (fc.senkouSpanA) allPrices.push(fc.senkouSpanA)
        if (fc.senkouSpanB) allPrices.push(fc.senkouSpanB)
      })
    }

    const minPrice = Math.min(...allPrices.filter(p => p > 0))
    const maxPrice = Math.max(...allPrices)
    const priceRange = maxPrice - minPrice
    const padding = priceRange * 0.1

    const chartMinPrice = minPrice - padding
    const chartMaxPrice = maxPrice + padding
    const chartPriceRange = chartMaxPrice - chartMinPrice

    // Chart dimensions
    const chartPadding = { top: 20, right: 80, bottom: 30, left: 20 }
    const chartWidth = width - chartPadding.left - chartPadding.right
    const chartHeight = height - chartPadding.top - chartPadding.bottom

    // Account for future cloud projection
    const totalBars = chartCandles.length + (showIchimoku ? 26 : 0)
    const candleSpacing = chartWidth / totalBars
    const candleWidth = Math.max(candleSpacing * 0.7, 2)

    // Helper to convert price to Y
    const priceToY = (price: number) => 
      chartPadding.top + ((chartMaxPrice - price) / chartPriceRange) * chartHeight

    // Helper to convert index to X
    const indexToX = (index: number) =>
      chartPadding.left + index * candleSpacing + candleSpacing / 2

    // Draw grid
    ctx.strokeStyle = '#1a1a24'
    ctx.lineWidth = 1

    // Horizontal grid lines
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = chartPadding.top + (chartHeight / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(chartPadding.left, y)
      ctx.lineTo(width - chartPadding.right, y)
      ctx.stroke()

      // Price labels
      const price = chartMaxPrice - (chartPriceRange / gridLines) * i
      ctx.fillStyle = '#6b7280'
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`$${price.toFixed(2)}`, width - chartPadding.right + 8, y + 4)
    }

    // Draw Ichimoku Cloud (behind candles)
    if (showIchimoku && ichimokuData.length > 0) {
      // Draw future cloud projection
      if (futureCloud.length > 0) {
        ctx.globalAlpha = 0.5
        for (let i = 0; i < futureCloud.length; i++) {
          const fc = futureCloud[i]
          if (fc.senkouSpanA === null || fc.senkouSpanB === null) continue

          const x = indexToX(chartCandles.length + i)
          const yA = priceToY(fc.senkouSpanA)
          const yB = priceToY(fc.senkouSpanB)

          ctx.fillStyle = fc.cloudColor === 'bullish' 
            ? ICHIMOKU_COLORS.cloudBullish 
            : ICHIMOKU_COLORS.cloudBearish
          ctx.fillRect(x - candleSpacing / 2, Math.min(yA, yB), candleSpacing, Math.abs(yB - yA) || 1)
        }
        ctx.globalAlpha = 1
      }

      // Draw historical cloud
      for (let i = 0; i < ichimokuData.length; i++) {
        const ichi = ichimokuData[i]
        if (ichi.cloudTop === null || ichi.cloudBottom === null) continue

        const x = indexToX(i)
        const yTop = priceToY(ichi.cloudTop)
        const yBottom = priceToY(ichi.cloudBottom)

        ctx.fillStyle = ichi.cloudColor === 'bullish' 
          ? ICHIMOKU_COLORS.cloudBullish 
          : ICHIMOKU_COLORS.cloudBearish
        ctx.fillRect(x - candleSpacing / 2, yTop, candleSpacing, yBottom - yTop || 1)
      }

      // Draw Tenkan-sen (Conversion Line)
      ctx.strokeStyle = ICHIMOKU_COLORS.tenkanSen
      ctx.lineWidth = 1.5
      ctx.beginPath()
      let started = false
      for (let i = 0; i < ichimokuData.length; i++) {
        const val = ichimokuData[i].tenkanSen
        if (val === null) continue
        const x = indexToX(i)
        const y = priceToY(val)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Draw Kijun-sen (Base Line)
      ctx.strokeStyle = ICHIMOKU_COLORS.kijunSen
      ctx.beginPath()
      started = false
      for (let i = 0; i < ichimokuData.length; i++) {
        const val = ichimokuData[i].kijunSen
        if (val === null) continue
        const x = indexToX(i)
        const y = priceToY(val)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Draw Chikou Span (Lagging Span) - needs to be shifted back
      ctx.strokeStyle = ICHIMOKU_COLORS.chikouSpan
      ctx.lineWidth = 1
      ctx.setLineDash([3, 2])
      ctx.beginPath()
      started = false
      for (let i = 0; i < chartCandles.length - 26; i++) {
        const close = chartCandles[i + 26]?.close
        if (close === undefined) continue
        const x = indexToX(i)
        const y = priceToY(close)
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw candles
    chartCandles.forEach((candle, i) => {
      const x = indexToX(i)
      const isGreen = candle.close >= candle.open

      // Calculate y positions
      const yHigh = priceToY(candle.high)
      const yLow = priceToY(candle.low)
      const yOpen = priceToY(candle.open)
      const yClose = priceToY(candle.close)

      // Wick
      ctx.strokeStyle = isGreen ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, yHigh)
      ctx.lineTo(x, yLow)
      ctx.stroke()

      // Body
      ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444'
      const bodyTop = Math.min(yOpen, yClose)
      const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1)
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight)
    })

    // Draw position markers
    const currentPosition = positions.find(p => p.symbol === symbol)
    if (currentPosition) {
      // Entry line
      const yEntry = priceToY(currentPosition.entryPrice)
      if (yEntry > chartPadding.top && yEntry < height - chartPadding.bottom) {
        ctx.strokeStyle = '#8b5cf6'
        ctx.setLineDash([5, 5])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(chartPadding.left, yEntry)
        ctx.lineTo(width - chartPadding.right, yEntry)
        ctx.stroke()
        ctx.setLineDash([])

        // Entry label
        ctx.fillStyle = '#8b5cf6'
        ctx.fillRect(width - chartPadding.right - 60, yEntry - 10, 60, 20)
        ctx.fillStyle = '#fff'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`Entry`, width - chartPadding.right - 30, yEntry + 4)
      }

      // Stop loss line
      if (currentPosition.stopLoss) {
        const ySL = priceToY(currentPosition.stopLoss)
        if (ySL > chartPadding.top && ySL < height - chartPadding.bottom) {
          ctx.strokeStyle = '#ef4444'
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(chartPadding.left, ySL)
          ctx.lineTo(width - chartPadding.right, ySL)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.fillStyle = '#ef4444'
          ctx.fillRect(width - chartPadding.right - 60, ySL - 10, 60, 20)
          ctx.fillStyle = '#fff'
          ctx.fillText(`SL`, width - chartPadding.right - 30, ySL + 4)
        }
      }

      // Take profit line
      if (currentPosition.takeProfit) {
        const yTP = priceToY(currentPosition.takeProfit)
        if (yTP > chartPadding.top && yTP < height - chartPadding.bottom) {
          ctx.strokeStyle = '#22c55e'
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(chartPadding.left, yTP)
          ctx.lineTo(width - chartPadding.right, yTP)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.fillStyle = '#22c55e'
          ctx.fillRect(width - chartPadding.right - 60, yTP - 10, 60, 20)
          ctx.fillStyle = '#fff'
          ctx.fillText(`TP`, width - chartPadding.right - 30, yTP + 4)
        }
      }
    }

    // Current price line (use real-time price if available)
    const currentPrice = realtimePrice?.price || ticker?.last || chartCandles[chartCandles.length - 1]?.close || 0
    const yCurrentPrice = priceToY(currentPrice)
    
    if (yCurrentPrice > chartPadding.top && yCurrentPrice < height - chartPadding.bottom) {
      ctx.strokeStyle = connected ? '#00ff88' : '#f59e0b'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(chartPadding.left, yCurrentPrice)
      ctx.lineTo(width - chartPadding.right, yCurrentPrice)
      ctx.stroke()
      ctx.setLineDash([])

      // Current price label
      ctx.fillStyle = connected ? '#00ff88' : '#f59e0b'
      ctx.fillRect(width - chartPadding.right, yCurrentPrice - 10, 80, 20)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`$${currentPrice.toFixed(2)}`, width - chartPadding.right + 4, yCurrentPrice + 4)
    }

  }, [chartCandles, dimensions, positions, symbol, ticker, ichimokuData, futureCloud, showIchimoku, connected, realtimePrice])

  // Timeframe buttons
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Loading overlay */}
      {loading && candles.length === 0 && (
        <div className="absolute inset-0 bg-[#0a0a0f]/80 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading market data...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-12 left-2 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs text-red-400 z-10">
          CCXT Error: {error}
        </div>
      )}

      {/* No data message */}
      {!loading && chartCandles.length === 0 && !error && (
        <div className="absolute inset-0 bg-[#0a0a0f]/80 flex items-center justify-center z-10">
          <div className="text-center text-gray-400">
            <p className="text-sm mb-2">No chart data available</p>
            <button 
              onClick={() => refetchCandles()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Timeframe selector */}
      <div className="absolute top-2 left-2 flex gap-1 z-10">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2 py-1 text-xs rounded ${
              timeframe === tf
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Ichimoku toggle and signal */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <button
          onClick={() => setShowIchimoku(!showIchimoku)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            showIchimoku
              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
              : 'bg-gray-800 text-gray-500 border border-gray-700'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5" />
          Ichimoku
        </button>

        {showIchimoku && ichimokuSignal && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium ${
            ichimokuSignal.type === 'strong_buy' || ichimokuSignal.type === 'buy'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : ichimokuSignal.type === 'strong_sell' || ichimokuSignal.type === 'sell'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {ichimokuSignal.type.includes('buy') ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : ichimokuSignal.type.includes('sell') ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            {ichimokuSignal.type.replace('_', ' ').toUpperCase()}
            <span className="text-[10px] opacity-70">({ichimokuSignal.confidence}%)</span>
          </div>
        )}
      </div>

      {/* Connection status */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <button
          onClick={() => setUseLiveData(!useLiveData)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
            connected
              ? 'bg-green-500/20 text-green-400 animate-pulse'
              : useLiveData && !error
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-gray-800 text-gray-500'
          }`}
        >
          {connected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span className="font-mono">{realtimePrice?.price?.toFixed(2) || 'LIVE'}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              {useLiveData ? 'Connecting...' : 'Paused'}
            </>
          )}
        </button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-gray-500 hover:text-white"
          onClick={() => refetchCandles()}
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {/* Ichimoku Legend */}
      {showIchimoku && (
        <div className="absolute bottom-10 left-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] z-10 bg-black/50 p-1.5 rounded">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5" style={{ backgroundColor: ICHIMOKU_COLORS.tenkanSen }} />
            <span className="text-gray-400">Tenkan</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5" style={{ backgroundColor: ICHIMOKU_COLORS.kijunSen }} />
            <span className="text-gray-400">Kijun</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5" style={{ backgroundColor: ICHIMOKU_COLORS.chikouSpan }} />
            <span className="text-gray-400">Chikou</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: ICHIMOKU_COLORS.cloudBullish.replace('0.15', '0.5') }} />
            <span className="text-gray-400">Cloud</span>
          </span>
        </div>
      )}

      {/* Last update */}
      {lastUpdate && (
        <div className="absolute bottom-2 left-2 text-[10px] text-gray-600 z-10">
          Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}

      {/* Real-time change indicator */}
      {realtimePrice && (
        <div className={`absolute bottom-2 right-2 text-[10px] z-10 ${
          realtimePrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          24h: {realtimePrice.change24h >= 0 ? '+' : ''}{realtimePrice.change24h.toFixed(2)}%
        </div>
      )}

      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

// Fallback mock data generator
function generateMockCandles(symbol: string, count: number = 100) {
  const basePrice = symbol.includes('BTC') ? 67000 : 
                    symbol.includes('ETH') ? 3400 : 
                    symbol.includes('SOL') ? 175 : 100
  
  const data = []
  let price = basePrice
  const now = Date.now()

  for (let i = count; i >= 0; i--) {
    const volatility = basePrice * 0.02
    const change = (Math.random() - 0.5) * volatility
    const open = price
    const close = price + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    const volume = Math.random() * 1000000

    data.push({
      time: now - i * 3600000,
      open,
      high,
      low,
      close,
      volume,
    })

    price = close
  }

  return data
}
