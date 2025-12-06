#!/usr/bin/env python3
"""
Market Data Scraper Service
Runs 24/7 to collect and store market data for PersRM training and UI display.
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/kr/ChatOS-v2.0/scrapers/logs/market_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('MarketScraper')

# Try to import ccxt
try:
    import ccxt.async_support as ccxt
    CCXT_AVAILABLE = True
except ImportError:
    logger.warning("CCXT not available, using mock data")
    CCXT_AVAILABLE = False

# Try to import aiohttp for news scraping
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    logger.warning("aiohttp not available")
    AIOHTTP_AVAILABLE = False

# Configuration
DATA_DIR = Path('/home/kr/ChatOS-v2.0/sandbox-ui/data')
MARKET_DATA_DIR = DATA_DIR / 'market-history'
NEWS_DATA_DIR = DATA_DIR / 'news'
SENTIMENT_DATA_DIR = DATA_DIR / 'sentiment'
LOGS_DIR = Path('/home/kr/ChatOS-v2.0/scrapers/logs')

# Ensure directories exist
for d in [DATA_DIR, MARKET_DATA_DIR, NEWS_DATA_DIR, SENTIMENT_DATA_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Trading pairs to track
SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT']
TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d']


class MarketDataScraper:
    """Scrapes market data from exchanges using CCXT."""
    
    def __init__(self):
        self.exchange = None
        self.running = False
        
    async def initialize(self):
        """Initialize exchange connection."""
        if CCXT_AVAILABLE:
            self.exchange = ccxt.binance({
                'enableRateLimit': True,
                'options': {'defaultType': 'future'}
            })
            logger.info("Connected to Binance")
        else:
            logger.warning("CCXT not available, will generate mock data")
    
    async def close(self):
        """Close exchange connection."""
        if self.exchange:
            await self.exchange.close()
    
    async def fetch_ticker(self, symbol: str) -> Optional[Dict]:
        """Fetch current ticker data."""
        if not self.exchange:
            return self._mock_ticker(symbol)
        
        try:
            ticker = await self.exchange.fetch_ticker(symbol)
            return {
                'symbol': symbol.replace('/', ''),
                'last': ticker['last'],
                'bid': ticker['bid'],
                'ask': ticker['ask'],
                'high': ticker['high'],
                'low': ticker['low'],
                'volume': ticker['quoteVolume'],
                'change': ticker['change'],
                'percentage': ticker['percentage'],
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error fetching ticker for {symbol}: {e}")
            return None
    
    async def fetch_orderbook(self, symbol: str, limit: int = 20) -> Optional[Dict]:
        """Fetch order book data."""
        if not self.exchange:
            return self._mock_orderbook(symbol)
        
        try:
            orderbook = await self.exchange.fetch_order_book(symbol, limit)
            return {
                'symbol': symbol.replace('/', ''),
                'bids': orderbook['bids'][:limit],
                'asks': orderbook['asks'][:limit],
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error fetching orderbook for {symbol}: {e}")
            return None
    
    async def fetch_ohlcv(self, symbol: str, timeframe: str = '1h', limit: int = 100) -> Optional[List]:
        """Fetch OHLCV candle data."""
        if not self.exchange:
            return self._mock_ohlcv(symbol, limit)
        
        try:
            ohlcv = await self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            return [{
                'timestamp': candle[0],
                'open': candle[1],
                'high': candle[2],
                'low': candle[3],
                'close': candle[4],
                'volume': candle[5],
            } for candle in ohlcv]
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return None
    
    async def fetch_trades(self, symbol: str, limit: int = 50) -> Optional[List]:
        """Fetch recent trades."""
        if not self.exchange:
            return self._mock_trades(symbol, limit)
        
        try:
            trades = await self.exchange.fetch_trades(symbol, limit=limit)
            return [{
                'id': trade['id'],
                'price': trade['price'],
                'amount': trade['amount'],
                'side': trade['side'],
                'timestamp': trade['timestamp'],
            } for trade in trades]
        except Exception as e:
            logger.error(f"Error fetching trades for {symbol}: {e}")
            return None
    
    def _mock_ticker(self, symbol: str) -> Dict:
        """Generate mock ticker data."""
        import random
        base_prices = {
            'BTC/USDT': 101500, 'ETH/USDT': 3900, 'SOL/USDT': 225,
            'BNB/USDT': 720, 'XRP/USDT': 2.45, 'ADA/USDT': 1.05,
            'DOGE/USDT': 0.41, 'AVAX/USDT': 48
        }
        base = base_prices.get(symbol, 100)
        price = base * (1 + random.uniform(-0.02, 0.02))
        return {
            'symbol': symbol.replace('/', ''),
            'last': price,
            'bid': price * 0.9999,
            'ask': price * 1.0001,
            'high': price * 1.02,
            'low': price * 0.98,
            'volume': random.uniform(1e9, 5e9),
            'change': random.uniform(-3, 3),
            'percentage': random.uniform(-3, 3),
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
    
    def _mock_orderbook(self, symbol: str) -> Dict:
        """Generate mock order book."""
        import random
        base_prices = {'BTC/USDT': 101500, 'ETH/USDT': 3900, 'SOL/USDT': 225}
        base = base_prices.get(symbol, 100)
        
        bids = [[base * (1 - 0.0001 * i), random.uniform(0.1, 10)] for i in range(20)]
        asks = [[base * (1 + 0.0001 * i), random.uniform(0.1, 10)] for i in range(20)]
        
        return {
            'symbol': symbol.replace('/', ''),
            'bids': bids,
            'asks': asks,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
    
    def _mock_ohlcv(self, symbol: str, limit: int) -> List[Dict]:
        """Generate mock OHLCV data."""
        import random
        base_prices = {'BTC/USDT': 101500, 'ETH/USDT': 3900, 'SOL/USDT': 225}
        base = base_prices.get(symbol, 100)
        
        candles = []
        price = base
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        
        for i in range(limit):
            change = random.uniform(-0.01, 0.01)
            open_price = price
            close_price = price * (1 + change)
            high = max(open_price, close_price) * (1 + random.uniform(0, 0.005))
            low = min(open_price, close_price) * (1 - random.uniform(0, 0.005))
            
            candles.append({
                'timestamp': now - (limit - i) * 3600000,
                'open': open_price,
                'high': high,
                'low': low,
                'close': close_price,
                'volume': random.uniform(1e6, 1e8),
            })
            price = close_price
        
        return candles
    
    def _mock_trades(self, symbol: str, limit: int) -> List[Dict]:
        """Generate mock trades."""
        import random
        base_prices = {'BTC/USDT': 101500, 'ETH/USDT': 3900, 'SOL/USDT': 225}
        base = base_prices.get(symbol, 100)
        
        trades = []
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        
        for i in range(limit):
            trades.append({
                'id': f'mock-{now}-{i}',
                'price': base * (1 + random.uniform(-0.001, 0.001)),
                'amount': random.uniform(0.01, 5),
                'side': random.choice(['buy', 'sell']),
                'timestamp': now - i * 1000,
            })
        
        return trades
    
    async def save_data(self, data_type: str, symbol: str, data: Any):
        """Save scraped data to JSON files."""
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        symbol_clean = symbol.replace('/', '')
        
        dir_path = MARKET_DATA_DIR / date_str / symbol_clean
        dir_path.mkdir(parents=True, exist_ok=True)
        
        file_path = dir_path / f'{data_type}.json'
        
        # Load existing data
        existing = []
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    existing = json.load(f)
            except:
                existing = []
        
        # Append new data (keep last 1000 entries per file)
        if isinstance(data, list):
            existing.extend(data)
        else:
            existing.append(data)
        
        existing = existing[-1000:]
        
        # Save
        with open(file_path, 'w') as f:
            json.dump(existing, f)
        
        logger.debug(f"Saved {data_type} for {symbol}")
    
    async def run_scrape_cycle(self):
        """Run one full scraping cycle for all symbols."""
        for symbol in SYMBOLS:
            try:
                # Fetch and save ticker
                ticker = await self.fetch_ticker(symbol)
                if ticker:
                    await self.save_data('tickers', symbol, ticker)
                
                # Fetch and save orderbook
                orderbook = await self.fetch_orderbook(symbol)
                if orderbook:
                    await self.save_data('orderbooks', symbol, orderbook)
                
                # Fetch and save trades
                trades = await self.fetch_trades(symbol)
                if trades:
                    await self.save_data('trades', symbol, trades)
                
                # Small delay between symbols
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error scraping {symbol}: {e}")
        
        # Fetch OHLCV less frequently (once per cycle)
        for symbol in SYMBOLS[:3]:  # Top 3 symbols
            for timeframe in ['1h', '4h']:
                try:
                    ohlcv = await self.fetch_ohlcv(symbol, timeframe)
                    if ohlcv:
                        await self.save_data(f'ohlcv-{timeframe}', symbol, ohlcv)
                except Exception as e:
                    logger.error(f"Error fetching OHLCV {symbol} {timeframe}: {e}")
    
    async def run(self, interval: int = 30):
        """Run continuous scraping loop."""
        await self.initialize()
        self.running = True
        
        logger.info(f"Starting market data scraper (interval: {interval}s)")
        
        cycle_count = 0
        while self.running:
            try:
                cycle_count += 1
                logger.info(f"Starting scrape cycle #{cycle_count}")
                
                await self.run_scrape_cycle()
                
                logger.info(f"Completed cycle #{cycle_count}, waiting {interval}s...")
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in scrape cycle: {e}")
                await asyncio.sleep(10)
        
        await self.close()
        logger.info("Market scraper stopped")
    
    def stop(self):
        """Stop the scraper."""
        self.running = False


class NewsScraper:
    """Scrapes crypto news from various sources."""
    
    def __init__(self):
        self.running = False
        self.sources = [
            'https://api.coingecko.com/api/v3/news',
            # Add more sources as needed
        ]
    
    async def fetch_news(self) -> List[Dict]:
        """Fetch news from various sources."""
        news_items = []
        
        if not AIOHTTP_AVAILABLE:
            return self._mock_news()
        
        async with aiohttp.ClientSession() as session:
            for source in self.sources:
                try:
                    async with session.get(source, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            # Process based on source format
                            if 'data' in data:
                                for item in data['data'][:10]:
                                    news_items.append({
                                        'id': item.get('id', str(hash(item.get('title', '')))),
                                        'title': item.get('title', ''),
                                        'source': item.get('news_site', 'Unknown'),
                                        'url': item.get('url', ''),
                                        'timestamp': item.get('updated_at', datetime.now(timezone.utc).isoformat()),
                                        'sentiment': self._analyze_sentiment(item.get('title', '')),
                                        'symbols': self._extract_symbols(item.get('title', '')),
                                    })
                except Exception as e:
                    logger.error(f"Error fetching news from {source}: {e}")
        
        if not news_items:
            news_items = self._mock_news()
        
        return news_items
    
    def _mock_news(self) -> List[Dict]:
        """Generate mock news data."""
        import random
        
        headlines = [
            ("Bitcoin breaks new resistance level as institutional interest grows", "bullish", ["BTCUSDT"]),
            ("Ethereum upgrade expected to boost network efficiency", "bullish", ["ETHUSDT"]),
            ("Crypto market sees increased volatility amid regulatory news", "neutral", []),
            ("Solana DeFi ecosystem reaches new milestone", "bullish", ["SOLUSDT"]),
            ("Market analysts predict short-term correction", "bearish", ["BTCUSDT", "ETHUSDT"]),
            ("Major exchange adds new trading pairs", "neutral", []),
            ("Bitcoin ETF sees record inflows", "bullish", ["BTCUSDT"]),
            ("Regulatory clarity could boost institutional adoption", "bullish", []),
        ]
        
        news = []
        now = datetime.now(timezone.utc)
        
        for i, (title, sentiment, symbols) in enumerate(headlines):
            news.append({
                'id': f'mock-news-{i}',
                'title': title,
                'source': random.choice(['CoinDesk', 'CoinTelegraph', 'Bloomberg Crypto', 'The Block']),
                'url': f'https://example.com/news/{i}',
                'timestamp': (now - timedelta(hours=i)).isoformat(),
                'sentiment': sentiment,
                'symbols': symbols,
            })
        
        return news
    
    def _analyze_sentiment(self, text: str) -> str:
        """Simple sentiment analysis based on keywords."""
        text_lower = text.lower()
        
        bullish_words = ['surge', 'rally', 'bullish', 'gains', 'rises', 'growth', 'adoption', 'milestone', 'record', 'inflows']
        bearish_words = ['crash', 'plunge', 'bearish', 'drop', 'falls', 'correction', 'sell-off', 'decline', 'outflows']
        
        bullish_score = sum(1 for word in bullish_words if word in text_lower)
        bearish_score = sum(1 for word in bearish_words if word in text_lower)
        
        if bullish_score > bearish_score:
            return 'bullish'
        elif bearish_score > bullish_score:
            return 'bearish'
        return 'neutral'
    
    def _extract_symbols(self, text: str) -> List[str]:
        """Extract crypto symbols mentioned in text."""
        symbols = []
        text_upper = text.upper()
        
        symbol_map = {
            'BITCOIN': 'BTCUSDT', 'BTC': 'BTCUSDT',
            'ETHEREUM': 'ETHUSDT', 'ETH': 'ETHUSDT',
            'SOLANA': 'SOLUSDT', 'SOL': 'SOLUSDT',
            'BNB': 'BNBUSDT', 'BINANCE': 'BNBUSDT',
            'XRP': 'XRPUSDT', 'RIPPLE': 'XRPUSDT',
            'CARDANO': 'ADAUSDT', 'ADA': 'ADAUSDT',
            'DOGECOIN': 'DOGEUSDT', 'DOGE': 'DOGEUSDT',
        }
        
        for keyword, symbol in symbol_map.items():
            if keyword in text_upper and symbol not in symbols:
                symbols.append(symbol)
        
        return symbols
    
    async def save_news(self, news: List[Dict]):
        """Save news to JSON file."""
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        file_path = NEWS_DATA_DIR / f'{date_str}.json'
        
        # Load existing
        existing = []
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    existing = json.load(f)
            except:
                existing = []
        
        # Merge (deduplicate by id)
        existing_ids = {item['id'] for item in existing}
        for item in news:
            if item['id'] not in existing_ids:
                existing.append(item)
        
        # Keep last 100
        existing = existing[-100:]
        
        with open(file_path, 'w') as f:
            json.dump(existing, f, indent=2)
        
        logger.info(f"Saved {len(news)} news items")
    
    async def run(self, interval: int = 300):
        """Run continuous news scraping loop."""
        self.running = True
        logger.info(f"Starting news scraper (interval: {interval}s)")
        
        while self.running:
            try:
                news = await self.fetch_news()
                await self.save_news(news)
                
                logger.info(f"Fetched {len(news)} news items, waiting {interval}s...")
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in news scrape: {e}")
                await asyncio.sleep(60)
        
        logger.info("News scraper stopped")
    
    def stop(self):
        self.running = False


class SentimentAggregator:
    """Aggregates sentiment data from various sources."""
    
    def __init__(self):
        self.running = False
    
    async def calculate_market_sentiment(self) -> Dict:
        """Calculate overall market sentiment."""
        import random
        
        # In production, this would aggregate from:
        # - Fear & Greed Index
        # - Social media sentiment
        # - News sentiment
        # - Funding rates
        # - Long/short ratios
        
        now = datetime.now(timezone.utc)
        
        return {
            'timestamp': now.isoformat(),
            'fear_greed_index': random.randint(25, 75),
            'fear_greed_label': 'Greed' if random.random() > 0.5 else 'Fear',
            'btc_dominance': round(random.uniform(50, 55), 2),
            'total_market_cap': round(random.uniform(2.3, 2.6), 2),  # Trillions
            'funding_rate': round(random.uniform(-0.01, 0.03), 4),
            'long_short_ratio': round(random.uniform(0.8, 1.3), 2),
            'social_volume': {
                'twitter': random.randint(-20, 50),
                'reddit': random.randint(-10, 40),
                'telegram': random.randint(-15, 35),
            },
            'symbols': {
                'BTCUSDT': {
                    'sentiment_score': random.randint(40, 80),
                    'social_mentions': random.randint(1000, 5000),
                    'funding_rate': round(random.uniform(-0.01, 0.03), 4),
                },
                'ETHUSDT': {
                    'sentiment_score': random.randint(40, 80),
                    'social_mentions': random.randint(500, 2500),
                    'funding_rate': round(random.uniform(-0.01, 0.03), 4),
                },
                'SOLUSDT': {
                    'sentiment_score': random.randint(40, 80),
                    'social_mentions': random.randint(200, 1000),
                    'funding_rate': round(random.uniform(-0.01, 0.03), 4),
                },
            }
        }
    
    async def save_sentiment(self, sentiment: Dict):
        """Save sentiment data."""
        date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        file_path = SENTIMENT_DATA_DIR / f'{date_str}.json'
        
        existing = []
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    existing = json.load(f)
            except:
                existing = []
        
        existing.append(sentiment)
        existing = existing[-288:]  # 5min intervals for 24h
        
        with open(file_path, 'w') as f:
            json.dump(existing, f, indent=2)
        
        # Also save latest for easy access
        latest_path = SENTIMENT_DATA_DIR / 'latest.json'
        with open(latest_path, 'w') as f:
            json.dump(sentiment, f, indent=2)
        
        logger.info("Saved sentiment data")
    
    async def run(self, interval: int = 300):
        """Run continuous sentiment aggregation."""
        self.running = True
        logger.info(f"Starting sentiment aggregator (interval: {interval}s)")
        
        while self.running:
            try:
                sentiment = await self.calculate_market_sentiment()
                await self.save_sentiment(sentiment)
                
                logger.info(f"Updated sentiment (F&G: {sentiment['fear_greed_index']}), waiting {interval}s...")
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in sentiment aggregation: {e}")
                await asyncio.sleep(60)
        
        logger.info("Sentiment aggregator stopped")
    
    def stop(self):
        self.running = False


async def main():
    """Main entry point - runs all scrapers concurrently."""
    logger.info("=" * 60)
    logger.info("Starting PersRM Data Scraper Service")
    logger.info("=" * 60)
    
    market_scraper = MarketDataScraper()
    news_scraper = NewsScraper()
    sentiment_aggregator = SentimentAggregator()
    
    # Handle shutdown gracefully
    def shutdown_handler():
        logger.info("Shutdown signal received")
        market_scraper.stop()
        news_scraper.stop()
        sentiment_aggregator.stop()
    
    try:
        # Run all scrapers concurrently
        await asyncio.gather(
            market_scraper.run(interval=30),      # Market data every 30s
            news_scraper.run(interval=300),        # News every 5 min
            sentiment_aggregator.run(interval=300), # Sentiment every 5 min
        )
    except KeyboardInterrupt:
        shutdown_handler()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        shutdown_handler()


if __name__ == '__main__':
    asyncio.run(main())

