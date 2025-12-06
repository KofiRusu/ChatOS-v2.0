'use client'

import { useState, useEffect } from 'react'
import { useTradingStore } from '@/stores/trading-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TradingAssistant } from './ai/trading-assistant'
import { AutoTradingPanel } from './ai/auto-trading-panel'
import { BacktestPanel } from './backtest-panel'
import { DataDashboard } from './data-dashboard'
import { ValidationDashboard } from './validation-dashboard'
import { PaperTradingPanel } from './paper-trading-panel'
import { useSentimentData, useNewsData } from '@/hooks/use-scraped-data'
import { 
  Bot, 
  Newspaper, 
  BarChart3, 
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Zap,
  Cpu,
  Brain,
  Database,
  FileCheck,
  Wallet,
  RefreshCw
} from 'lucide-react'

export function RightPanel() {
  const { rightPanelTab, setRightPanelTab, news: storeNews, currentSymbol } = useTradingStore()
  
  // Use scraped data hooks
  const { sentiment, loading: sentimentLoading } = useSentimentData()
  const { news: scrapedNews, loading: newsLoading } = useNewsData(currentSymbol)

  // Merge store news with scraped news
  const allNews = scrapedNews.length > 0 ? scrapedNews : storeNews

  // Filter news for current symbol
  const filteredNews = allNews.filter(n => 
    n.symbols.includes(currentSymbol) || n.symbols.length === 0
  )

  return (
    <div className="w-80 border-l border-gray-800 bg-[#0d0d14] flex flex-col">
      <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start gap-0.5 px-2 pt-2 bg-transparent rounded-none h-auto pb-2 border-b border-gray-800 flex-nowrap overflow-x-auto">
          <TabsTrigger 
            value="assistant"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <Bot className="w-3.5 h-3.5 mr-1" />
            Assistant
          </TabsTrigger>
          <TabsTrigger 
            value="news"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <Newspaper className="w-3.5 h-3.5 mr-1" />
            News
          </TabsTrigger>
          <TabsTrigger 
            value="sentiment"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1" />
            Sentiment
          </TabsTrigger>
          <TabsTrigger 
            value="alerts"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <Bell className="w-3.5 h-3.5 mr-1" />
            Alerts
          </TabsTrigger>
          <TabsTrigger 
            value="auto"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <Cpu className="w-3.5 h-3.5 mr-1" />
            Auto
          </TabsTrigger>
          <TabsTrigger 
            value="backtest"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <Brain className="w-3.5 h-3.5 mr-1" />
            Test
          </TabsTrigger>
          <TabsTrigger 
            value="data"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <Database className="w-3.5 h-3.5 mr-1" />
            Data
          </TabsTrigger>
          <TabsTrigger 
            value="paper"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <Wallet className="w-3.5 h-3.5 mr-1" />
            Paper
          </TabsTrigger>
          <TabsTrigger 
            value="validate"
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <FileCheck className="w-3.5 h-3.5 mr-1" />
            Validate
          </TabsTrigger>
        </TabsList>

        {/* AI Assistant Tab */}
        <TabsContent value="assistant" className="flex-1 mt-0 overflow-hidden">
          <TradingAssistant />
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="flex-1 mt-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-gray-800">
              <Button size="sm" variant="outline" className="w-full text-xs">
                <Zap className="w-3 h-3 mr-1.5" />
                Summarize last 24h for {currentSymbol.replace('USDT', '')}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {filteredNews.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
                {filteredNews.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No news for {currentSymbol}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Loading indicator */}
              {sentimentLoading && (
                <div className="flex items-center justify-center py-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400 mr-2" />
                  <span className="text-xs text-gray-400">Loading live data...</span>
                </div>
              )}
              
              {/* Market Indices */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Market Indices</h3>
                <IndexCard 
                  name="BTC Dominance" 
                  value={sentiment ? `${sentiment.btc_dominance.toFixed(1)}%` : '...'} 
                  change={0.8} 
                />
                <IndexCard 
                  name="Total Market Cap" 
                  value={sentiment ? `$${sentiment.total_market_cap.toFixed(2)}T` : '...'} 
                  change={1.2} 
                />
                <IndexCard 
                  name="Fear & Greed" 
                  value={sentiment ? sentiment.fear_greed_index.toString() : '...'} 
                  label={sentiment?.fear_greed_label || 'Loading'}
                  labelColor={sentiment?.fear_greed_index > 50 ? "text-green-400" : "text-red-400"}
                />
                <IndexCard 
                  name="Funding Rate" 
                  value={sentiment ? `${(sentiment.funding_rate * 100).toFixed(3)}%` : '...'} 
                  change={sentiment?.funding_rate ? sentiment.funding_rate * 100 : 0} 
                />
              </div>

              {/* Sentiment Gauge */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  {currentSymbol} Sentiment
                </h3>
                <SentimentGauge value={
                  sentiment?.symbols?.[currentSymbol]?.sentiment_score || 50
                } />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Bearish</span>
                  <span>Bullish</span>
                </div>
                {sentiment?.symbols?.[currentSymbol] && (
                  <div className="mt-2 text-xs text-gray-400 text-center">
                    Score: {sentiment.symbols[currentSymbol].sentiment_score} | 
                    Mentions: {sentiment.symbols[currentSymbol].social_mentions.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Social Volume */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Social Activity</h3>
                <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Twitter Mentions</span>
                    <span className={`text-sm font-medium ${(sentiment?.social_volume?.twitter || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {sentiment?.social_volume?.twitter !== undefined 
                        ? `${sentiment.social_volume.twitter >= 0 ? '+' : ''}${sentiment.social_volume.twitter}%`
                        : '...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Reddit Posts</span>
                    <span className={`text-sm font-medium ${(sentiment?.social_volume?.reddit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {sentiment?.social_volume?.reddit !== undefined 
                        ? `${sentiment.social_volume.reddit >= 0 ? '+' : ''}${sentiment.social_volume.reddit}%`
                        : '...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Telegram Activity</span>
                    <span className={`text-sm font-medium ${(sentiment?.social_volume?.telegram || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {sentiment?.social_volume?.telegram !== undefined 
                        ? `${sentiment.social_volume.telegram >= 0 ? '+' : ''}${sentiment.social_volume.telegram}%`
                        : '...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Long/Short Ratio */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Long/Short Ratio</span>
                  <span className={`text-sm font-medium ${(sentiment?.long_short_ratio || 1) >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                    {sentiment?.long_short_ratio?.toFixed(2) || '...'}
                  </span>
                </div>
              </div>

              {/* Data Source */}
              <div className="text-center text-[10px] text-gray-600">
                {sentiment?.timestamp && (
                  <>Last updated: {new Date(sentiment.timestamp).toLocaleTimeString()}</>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="flex-1 mt-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-gray-800">
              <Button size="sm" className="w-full text-xs bg-purple-600 hover:bg-purple-700">
                <Bell className="w-3 h-3 mr-1.5" />
                Create New Alert
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                <AlertCard 
                  symbol="BTCUSDT"
                  condition="Price above"
                  value="$70,000"
                  active
                />
                <AlertCard 
                  symbol="ETHUSDT"
                  condition="Price below"
                  value="$3,200"
                  active
                />
                <AlertCard 
                  symbol="BTCUSDT"
                  condition="RSI above"
                  value="70"
                  active={false}
                />
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Auto Trading Tab */}
        <TabsContent value="auto" className="flex-1 mt-0 overflow-hidden">
          <AutoTradingPanel />
        </TabsContent>

        {/* Backtest Tab */}
        <TabsContent value="backtest" className="flex-1 mt-0 overflow-hidden">
          <BacktestPanel />
        </TabsContent>

        {/* Data History Tab */}
        <TabsContent value="data" className="flex-1 mt-0 overflow-hidden">
          <DataDashboard />
        </TabsContent>

        {/* Paper Trading Tab */}
        <TabsContent value="paper" className="flex-1 mt-0 overflow-hidden">
          <PaperTradingPanel />
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validate" className="flex-1 mt-0 overflow-hidden">
          <ValidationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NewsCard({ item }: { item: { id: string; title: string; source: string; timestamp: string; sentiment: string } }) {
  const sentimentConfig = {
    bullish: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
    bearish: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10' },
    neutral: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  }

  const config = sentimentConfig[item.sentiment as keyof typeof sentimentConfig]
  const SentimentIcon = config.icon

  return (
    <div className="p-3 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer group">
      <div className="flex items-start gap-2 mb-2">
        <div className={`p-1 rounded ${config.bg}`}>
          <SentimentIcon className={`w-3 h-3 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2 group-hover:text-purple-400 transition-colors">
            {item.title}
          </p>
        </div>
        <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{item.source}</span>
        <span>•</span>
        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

function IndexCard({ 
  name, 
  value, 
  change, 
  label, 
  labelColor 
}: { 
  name: string
  value: string
  change?: number
  label?: string
  labelColor?: string 
}) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-gray-900/50 rounded-lg">
      <span className="text-sm text-gray-400">{name}</span>
      <div className="text-right">
        <span className="text-sm font-medium">{value}</span>
        {change !== undefined && (
          <span className={`text-xs ml-1.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
        {label && (
          <span className={`text-xs ml-1.5 ${labelColor}`}>{label}</span>
        )}
      </div>
    </div>
  )
}

function SentimentGauge({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value))
  
  return (
    <div className="relative h-3 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full">
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-900 shadow-lg"
        style={{ left: `calc(${clampedValue}% - 8px)` }}
      />
    </div>
  )
}

function AlertCard({ 
  symbol, 
  condition, 
  value, 
  active 
}: { 
  symbol: string
  condition: string
  value: string
  active: boolean 
}) {
  return (
    <div className={`p-3 rounded-lg border ${active ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-900/30 border-gray-800 opacity-60'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{symbol}</span>
        <Badge variant={active ? 'default' : 'secondary'} className="text-[10px]">
          {active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <div className="text-xs text-gray-400">
        {condition} <span className="text-white font-medium">{value}</span>
      </div>
    </div>
  )
}


