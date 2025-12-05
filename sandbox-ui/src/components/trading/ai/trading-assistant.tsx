'use client'

import { useState, useRef, useEffect } from 'react'
import { useTradingStore } from '@/stores/trading-store'
import { useMarketContextForAI } from '@/lib/trading/market-context'
import { useRealtime } from '@/lib/trading/realtime-ws'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  X,
  Zap,
  RefreshCw
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: TradingAction
}

interface TradingAction {
  type: 'trade' | 'analysis' | 'alert'
  side?: 'long' | 'short'
  symbol?: string
  size?: number
  stopLoss?: number
  takeProfit?: number
  riskPercent?: number
  confirmed?: boolean
}

// Quick action suggestions
const quickActions = [
  { label: 'Market analysis', prompt: 'Analyze the current BTC market structure' },
  { label: 'Trade idea', prompt: 'Give me a trade idea for ETH with proper risk management' },
  { label: 'Portfolio review', prompt: 'Review my current positions and suggest adjustments' },
  { label: 'Risk check', prompt: 'What is my current risk exposure?' },
]

export function TradingAssistant() {
  const { currentSymbol, positions, portfolio, addPosition, mode } = useTradingStore()
  
  // Market context from aggr.trade and other indexes for AI analysis
  const { symbolContext, fullContext, refresh: refreshContext, isLoading: contextLoading } = useMarketContextForAI(currentSymbol)
  
  // Real-time data from WebSocket for live price
  const { getPrice, connected } = useRealtime()
  const realtimePrice = getPrice(currentSymbol)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Fetch market context on mount and when symbol changes
  useEffect(() => {
    refreshContext()
  }, [currentSymbol])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const parseTradeIntent = (text: string): TradingAction | null => {
    const lowerText = text.toLowerCase()
    
    // Detect trade intent
    const isLong = lowerText.includes('long') || lowerText.includes('buy')
    const isShort = lowerText.includes('short') || lowerText.includes('sell')
    
    if (!isLong && !isShort) return null

    // Extract symbol
    const symbols = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'ada']
    const foundSymbol = symbols.find(s => lowerText.includes(s))
    const symbol = foundSymbol ? `${foundSymbol.toUpperCase()}USDT` : currentSymbol

    // Extract risk percentage
    const riskMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*%?\s*risk/)
    const riskPercent = riskMatch ? parseFloat(riskMatch[1]) : 1

    // Extract R multiple for TP
    const rMultipleMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*r/i)
    const rMultiple = rMultipleMatch ? parseFloat(rMultipleMatch[1]) : 3

    return {
      type: 'trade',
      side: isLong ? 'long' : 'short',
      symbol,
      riskPercent,
      confirmed: false,
    }
  }

  const generateResponse = async (userMessage: string): Promise<{ content: string; action?: TradingAction }> => {
    // Check for trade intent
    const tradeAction = parseTradeIntent(userMessage)
    
    if (tradeAction) {
      // Use REAL price from WebSocket or fallback
      const price = realtimePrice?.price || 67500
      const accountValue = portfolio.totalValue
      const riskAmount = accountValue * (tradeAction.riskPercent! / 100)
      const slDistance = price * 0.02 // 2% SL
      const size = riskAmount / slDistance
      const stopLoss = tradeAction.side === 'long' ? price - slDistance : price + slDistance
      const takeProfit = tradeAction.side === 'long' ? price + slDistance * 3 : price - slDistance * 3

      tradeAction.size = size
      tradeAction.stopLoss = stopLoss
      tradeAction.takeProfit = takeProfit

      return {
        content: `I've prepared a **${tradeAction.side?.toUpperCase()}** order for **${tradeAction.symbol}**:\n\n` +
          `📊 **Order Details**\n` +
          `- Entry: ~$${price.toLocaleString()}\n` +
          `- Size: ${size.toFixed(4)} ${tradeAction.symbol?.replace('USDT', '')}\n` +
          `- Stop Loss: $${stopLoss.toFixed(2)}\n` +
          `- Take Profit: $${takeProfit.toFixed(2)}\n` +
          `- Risk: $${riskAmount.toFixed(2)} (${tradeAction.riskPercent}% of account)\n` +
          `- R:R: 1:3\n\n` +
          `${mode === 'paper' ? '📝 Paper trading mode' : mode === 'live' ? '⚠️ LIVE trading mode' : '👁️ View only mode'}`,
        action: tradeAction,
      }
    }

    // Analysis responses - USE REAL MARKET CONTEXT FROM AGGR.TRADE & INDEXES
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('analyz') || lowerMessage.includes('trend') || lowerMessage.includes('market')) {
      // Use real data from market context
      const ctx = symbolContext
      const currentPrice = realtimePrice?.price || 0
      const change24h = realtimePrice?.change24h || 0
      
      return {
        content: `**${currentSymbol} Market Analysis** 📊\n\n` +
          `**Live Price:** $${currentPrice.toLocaleString()} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)\n\n` +
          `**Market Sentiment:** ${ctx.sentiment}\n\n` +
          `**🐋 Whale Activity:**\n${ctx.whaleActivity}\n\n` +
          `**💀 Liquidations:**\n${ctx.liquidations}\n\n` +
          `**📈 Order Flow:**\n${ctx.orderFlow}\n\n` +
          `**💡 Recommendation:**\n${ctx.recommendation}`,
        action: { type: 'analysis' },
      }
    }

    if (lowerMessage.includes('portfolio') || lowerMessage.includes('position')) {
      const positionSummary = positions.length > 0
        ? positions.map(p => `- ${p.symbol}: ${p.side} ${p.size.toFixed(4)} @ $${p.entryPrice.toLocaleString()} (${p.pnl >= 0 ? '+' : ''}${p.pnlPercent.toFixed(2)}%)`).join('\n')
        : 'No open positions'

      return {
        content: `**Portfolio Summary** 💼\n\n` +
          `**Account Value:** $${portfolio.totalValue.toLocaleString()}\n` +
          `**Today's PnL:** ${portfolio.dayPnl >= 0 ? '+' : ''}$${portfolio.dayPnl.toFixed(2)} (${portfolio.dayPnlPercent >= 0 ? '+' : ''}${portfolio.dayPnlPercent.toFixed(2)}%)\n` +
          `**Win Rate:** ${portfolio.winRate}%\n\n` +
          `**Open Positions:**\n${positionSummary}`,
      }
    }

    if (lowerMessage.includes('risk')) {
      const totalRisk = positions.reduce((sum, p) => {
        if (p.stopLoss) {
          const riskPerPosition = Math.abs(p.entryPrice - p.stopLoss) * p.size
          return sum + riskPerPosition
        }
        return sum
      }, 0)
      
      const riskPercent = (totalRisk / portfolio.totalValue) * 100

      return {
        content: `**Risk Analysis** ⚠️\n\n` +
          `**Total Risk:** $${totalRisk.toFixed(2)} (${riskPercent.toFixed(2)}% of account)\n` +
          `**Open Positions:** ${positions.length}\n` +
          `**Positions without SL:** ${positions.filter(p => !p.stopLoss).length}\n\n` +
          `${riskPercent > 5 ? '⚠️ **Warning:** Risk exceeds 5% recommendation' : '✅ Risk within acceptable limits'}`,
      }
    }

    // Default response
    return {
      content: `I can help you with:\n\n` +
        `🔍 **Analysis:** "Analyze BTC", "What's the trend on ETH?"\n` +
        `📈 **Trading:** "Long BTC with 1% risk", "Short ETH 2x leverage"\n` +
        `💼 **Portfolio:** "Review my positions", "What's my PnL?"\n` +
        `⚠️ **Risk:** "What's my current risk?", "Am I overexposed?"\n\n` +
        `Currently viewing: **${currentSymbol}**`,
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000))

    const response = await generateResponse(input)
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      action: response.action,
    }

    setMessages(prev => [...prev, assistantMessage])
    setIsTyping(false)
  }

  const handleConfirmTrade = (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message?.action || message.action.type !== 'trade') return

    if (mode === 'view') {
      alert('Switch to Paper or Live mode to execute trades')
      return
    }

    const action = message.action
    
    // Add position with REAL price
    const entryPrice = realtimePrice?.price || 67500
    addPosition({
      symbol: action.symbol!,
      side: action.side!,
      size: action.size!,
      entryPrice,
      currentPrice: entryPrice,
      pnl: 0,
      pnlPercent: 0,
      leverage: 1,
      stopLoss: action.stopLoss,
      takeProfit: action.takeProfit,
      strategy: 'AI Assistant',
      openedAt: new Date().toISOString(),
    })

    // Update message to show confirmed
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, action: { ...m.action!, confirmed: true } }
        : m
    ))

    // Add confirmation message
    const confirmMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ **Order Executed!**\n\n${action.side?.toUpperCase()} ${action.symbol} position opened.\nCheck the Positions panel to monitor your trade.`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, confirmMessage])
  }

  const handleRejectTrade = (messageId: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, action: undefined }
        : m
    ))

    const rejectMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Order cancelled. Let me know if you'd like to adjust the parameters or try a different trade.`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, rejectMessage])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Trade Action Card */}
              {message.action?.type === 'trade' && !message.action.confirmed && (
                <div className="ml-9 bg-gray-900 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {message.action.side === 'long' ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-medium">
                      {message.action.side?.toUpperCase()} {message.action.symbol}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {mode === 'paper' ? 'Paper' : mode === 'live' ? 'Live' : 'View'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                      onClick={() => handleConfirmTrade(message.id)}
                      disabled={mode === 'view'}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs border-gray-600"
                      onClick={() => handleRejectTrade(message.id)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirmed trade */}
              {message.action?.confirmed && (
                <div className="ml-9 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Trade executed successfully
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1 items-center">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setInput(action.prompt)}
              className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={refreshContext}
            disabled={contextLoading}
            className="text-[10px] px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 rounded-full text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${contextLoading ? 'animate-spin' : ''}`} />
            {contextLoading ? 'Loading...' : 'Refresh data'}
          </button>
        </div>
        {/* Connection status */}
        <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-500">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Live data connected' : 'Connecting to market data...'}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about markets or place trades..."
            className="flex-1 bg-gray-900 border-gray-700 text-sm"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

