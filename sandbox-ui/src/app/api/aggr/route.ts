import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

// Aggr.trade data directories
const HOME = os.homedir()
const AGGR_DATA_DIR = path.join(HOME, 'TradingMemory', 'aggr_data')
const TRAINING_DATA_DIR = path.join(HOME, 'persrm-data', 'synthetic', 'trading', 'aggr')

interface AggrStats {
  totalTrades: number
  totalVolumeUsd: number
  buyVolume: number
  sellVolume: number
  largeTradesCount: number
  whaleTradesCount: number
  liquidationsCount: number
  lastUpdated: string
}

interface LargeTrade {
  timestamp: string
  exchange: string
  symbol: string
  side: 'buy' | 'sell'
  price: number
  size: number
  value_usd: number
  is_large_trade: boolean
}

interface Liquidation {
  timestamp: string
  exchange: string
  symbol: string
  side: 'long' | 'short'
  price: number
  size: number
  value_usd: number
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'stats'
  const symbol = searchParams.get('symbol')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    switch (action) {
      case 'stats':
        return NextResponse.json(await getAggrStats())

      case 'whales':
        return NextResponse.json(await getLargeTrades(limit, symbol))

      case 'liquidations':
        return NextResponse.json(await getLiquidations(limit, symbol))

      case 'training':
        return NextResponse.json(await getTrainingExamples(limit))

      case 'health':
        return NextResponse.json(await checkScraperHealth())

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: stats, whales, liquidations, training, health' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Aggr API Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getAggrStats(): Promise<AggrStats> {
  try {
    // Read the most recent stats file if exists, otherwise return defaults
    const files = await fs.readdir(AGGR_DATA_DIR).catch(() => [])
    const tradeFiles = files.filter(f => f.startsWith('large_trades_'))
    const liqFiles = files.filter(f => f.startsWith('liquidations_'))

    let stats: AggrStats = {
      totalTrades: 0,
      totalVolumeUsd: 0,
      buyVolume: 0,
      sellVolume: 0,
      largeTradesCount: tradeFiles.length > 0 ? await countLines(path.join(AGGR_DATA_DIR, tradeFiles[tradeFiles.length - 1])) : 0,
      whaleTradesCount: 0,
      liquidationsCount: liqFiles.length > 0 ? await countLines(path.join(AGGR_DATA_DIR, liqFiles[liqFiles.length - 1])) : 0,
      lastUpdated: new Date().toISOString(),
    }

    // Parse most recent trade file for volume stats
    if (tradeFiles.length > 0) {
      const latestFile = path.join(AGGR_DATA_DIR, tradeFiles[tradeFiles.length - 1])
      const trades = await parseJsonlFile<LargeTrade>(latestFile)
      
      for (const trade of trades) {
        stats.totalVolumeUsd += trade.value_usd
        if (trade.side === 'buy') {
          stats.buyVolume += trade.value_usd
        } else {
          stats.sellVolume += trade.value_usd
        }
        if (trade.value_usd >= 500000) {
          stats.whaleTradesCount++
        }
      }
      stats.largeTradesCount = trades.length
    }

    return stats
  } catch (error) {
    console.error('Error getting aggr stats:', error)
    return {
      totalTrades: 0,
      totalVolumeUsd: 0,
      buyVolume: 0,
      sellVolume: 0,
      largeTradesCount: 0,
      whaleTradesCount: 0,
      liquidationsCount: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
}

async function getLargeTrades(limit: number, symbol?: string | null): Promise<LargeTrade[]> {
  try {
    const files = await fs.readdir(AGGR_DATA_DIR).catch(() => [])
    const tradeFiles = files
      .filter(f => f.startsWith('large_trades_'))
      .sort()
      .reverse() // Most recent first

    let allTrades: LargeTrade[] = []

    for (const file of tradeFiles) {
      if (allTrades.length >= limit) break
      const trades = await parseJsonlFile<LargeTrade>(path.join(AGGR_DATA_DIR, file))
      allTrades.push(...trades)
    }

    // Filter by symbol if provided
    if (symbol) {
      allTrades = allTrades.filter(t => 
        t.symbol.includes(symbol.replace('/', '').replace('USDT', ''))
      )
    }

    // Sort by timestamp descending and limit
    return allTrades
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('Error getting large trades:', error)
    return []
  }
}

async function getLiquidations(limit: number, symbol?: string | null): Promise<Liquidation[]> {
  try {
    const files = await fs.readdir(AGGR_DATA_DIR).catch(() => [])
    const liqFiles = files
      .filter(f => f.startsWith('liquidations_'))
      .sort()
      .reverse()

    let allLiqs: Liquidation[] = []

    for (const file of liqFiles) {
      if (allLiqs.length >= limit) break
      const liqs = await parseJsonlFile<Liquidation>(path.join(AGGR_DATA_DIR, file))
      allLiqs.push(...liqs)
    }

    // Filter by symbol if provided
    if (symbol) {
      allLiqs = allLiqs.filter(l => 
        l.symbol.includes(symbol.replace('/', '').replace('USDT', ''))
      )
    }

    return allLiqs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('Error getting liquidations:', error)
    return []
  }
}

async function getTrainingExamples(limit: number): Promise<any[]> {
  try {
    const files = await fs.readdir(TRAINING_DATA_DIR).catch(() => [])
    const trainingFiles = files
      .filter(f => f.startsWith('aggr_training_'))
      .sort()
      .reverse()

    let allExamples: any[] = []

    for (const file of trainingFiles) {
      if (allExamples.length >= limit) break
      const examples = await parseJsonlFile(path.join(TRAINING_DATA_DIR, file))
      allExamples.push(...examples)
    }

    return allExamples.slice(0, limit)
  } catch (error) {
    console.error('Error getting training examples:', error)
    return []
  }
}

async function checkScraperHealth(): Promise<{
  isRunning: boolean
  lastDataTimestamp: string | null
  dataDirectory: string
  fileCount: number
}> {
  try {
    const files = await fs.readdir(AGGR_DATA_DIR).catch(() => [])
    const dataFiles = files.filter(f => f.endsWith('.jsonl'))
    
    let lastTimestamp: string | null = null
    
    if (dataFiles.length > 0) {
      // Get most recent file modification time
      const latestFile = dataFiles.sort().reverse()[0]
      const stats = await fs.stat(path.join(AGGR_DATA_DIR, latestFile))
      lastTimestamp = stats.mtime.toISOString()
    }

    // Consider scraper "running" if data was updated in last 5 minutes
    const isRunning = lastTimestamp 
      ? (Date.now() - new Date(lastTimestamp).getTime()) < 5 * 60 * 1000
      : false

    return {
      isRunning,
      lastDataTimestamp: lastTimestamp,
      dataDirectory: AGGR_DATA_DIR,
      fileCount: dataFiles.length,
    }
  } catch (error) {
    return {
      isRunning: false,
      lastDataTimestamp: null,
      dataDirectory: AGGR_DATA_DIR,
      fileCount: 0,
    }
  }
}

// Helper to parse JSONL files
async function parseJsonlFile<T>(filepath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filepath, 'utf-8')
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
  } catch {
    return []
  }
}

// Helper to count lines in a file
async function countLines(filepath: string): Promise<number> {
  try {
    const content = await fs.readFile(filepath, 'utf-8')
    return content.split('\n').filter(line => line.trim()).length
  } catch {
    return 0
  }
}

