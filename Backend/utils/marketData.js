const fetch = require('node-fetch');

// Supported tokens and their CoinGecko IDs
const TOKEN_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'HBAR': 'hedera-hashgraph',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'LINK': 'chainlink',
  'MATIC': 'polygon'
};

// GeckoTerminal token addresses for Hedera network
const HEDERA_TOKEN_IDS = {
  'HBAR': '0.0.15058', // WHBAR[new] token ID from tokenstestnetSwap.json
  'USDC': '0.0.5449',  // USDC from tokenstestnetSwap.json
  'SAUCE': '0.0.1183558' // SAUCE from tokenstestnetSwap.json
};

// Cache for market data to avoid too many API calls
const marketDataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetch HBAR data from GeckoTerminal API
 * @param {string} tokenAddress - Hedera token address
 * @returns {Object} Token data from GeckoTerminal
 */
async function fetchHederaTokenData(tokenAddress) {
  try {
    console.log(`🦎 Fetching HBAR data from GeckoTerminal for ${tokenAddress}...`);
    
    const response = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/tokens/${tokenAddress}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HederaMarketService/1.0'
        },
        timeout: 10000
      }
    );

    if (!response.ok) {
      throw new Error(`GeckoTerminal API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.attributes) {
      throw new Error('Invalid GeckoTerminal response format');
    }

    const attributes = data.data.attributes;
    
    return {
      price: parseFloat(attributes.price_usd) || 0,
      change24h: parseFloat(attributes.price_change_percentage?.h24) || 0,
      volume24h: parseFloat(attributes.volume_usd?.h24) || 0,
      marketCap: parseFloat(attributes.market_cap_usd) || 0,
      lastUpdated: new Date().toISOString(),
      source: 'GeckoTerminal'
    };
  } catch (error) {
    console.error(`❌ Failed to fetch Hedera token data for ${tokenAddress}:`, error.message);
    return null;
  }
}

/**
 * Fetch live market data for supported tokens
 * @param {Array} tokens - Array of token symbols (e.g., ['BTC', 'ETH'])
 * @returns {Object} Market data for requested tokens
 */
async function fetchMarketData(tokens = ['BTC', 'ETH', 'HBAR', 'USDC', 'USDT', 'DAI', 'LINK', 'MATIC']) {
  try {
    // Check cache first
    const cacheKey = tokens.sort().join(',');
    const cached = marketDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Get CoinGecko IDs for requested tokens
    const coinIds = tokens
      .filter(token => TOKEN_IDS[token.toUpperCase()])
      .map(token => TOKEN_IDS[token.toUpperCase()])
      .join(',');

    if (!coinIds) {
      throw new Error('No valid tokens provided');
    }

    // Fetch data from CoinGecko API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mariposa-Trading-Bot/1.0'
        },
        timeout: 10000
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform data to more usable format
    const marketData = {};
    
    for (const [token, coinId] of Object.entries(TOKEN_IDS)) {
      if (data[coinId]) {
        marketData[token] = {
          price: data[coinId].usd,
          change24h: data[coinId].usd_24h_change || 0,
          volume24h: data[coinId].usd_24h_vol || 0,
          marketCap: data[coinId].usd_market_cap || 0,
          lastUpdated: new Date(data[coinId].last_updated_at * 1000).toISOString()
        };
      }
    }

    // Fetch HBAR data from GeckoTerminal if requested
    if (tokens.includes('HBAR') && HEDERA_TOKEN_IDS['HBAR']) {
      console.log('🦎 Fetching HBAR data from GeckoTerminal instead of CoinGecko...');
      const hbarData = await fetchHederaTokenData(HEDERA_TOKEN_IDS['HBAR']);
      if (hbarData) {
        marketData['HBAR'] = hbarData;
        console.log('✅ HBAR data updated from GeckoTerminal:', {
          price: hbarData.price,
          marketCap: hbarData.marketCap,
          change24h: hbarData.change24h
        });
      } else {
        console.warn('⚠️ Failed to fetch HBAR from GeckoTerminal, keeping CoinGecko data if available');
      }
    }

    // Add market summary and insights
    const marketSummary = generateMarketSummary(marketData);
    
    const result = {
      tokens: marketData,
      summary: marketSummary,
      timestamp: new Date().toISOString(),
      source: tokens.includes('HBAR') ? 'CoinGecko API + GeckoTerminal (HBAR)' : 'CoinGecko API'
    };

    // Cache the result
    marketDataCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;

  } catch (error) {
    console.error('Error fetching market data:', error);
    
    // Return cached data if available, otherwise return fallback
    const cacheKey = tokens.sort().join(',');
    const cached = marketDataCache.get(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Fallback data
    return {
      tokens: {},
      summary: {
        marketCondition: 'unknown',
        volatility: 'unknown',
        recommendation: 'Unable to fetch live market data. Proceed with caution and use default strategy settings.'
      },
      timestamp: new Date().toISOString(),
      source: 'Fallback data',
      error: error.message
    };
  }
}

/**
 * Generate market summary and insights
 * @param {Object} marketData - Token market data
 * @returns {Object} Market summary with insights
 */
function generateMarketSummary(marketData) {
  const tokens = Object.keys(marketData);
  
  if (tokens.length === 0) {
    return {
      marketCondition: 'unknown',
      volatility: 'unknown',
      recommendation: 'No market data available'
    };
  }

  // Calculate overall market sentiment
  const changes = tokens
    .filter(token => token !== 'USDC' && token !== 'USDT' && token !== 'DAI') // Exclude stablecoins
    .map(token => marketData[token].change24h)
    .filter(change => change !== undefined);

  const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const volatility = Math.abs(avgChange);

  // Determine market condition
  let marketCondition = 'neutral';
  if (avgChange > 5) marketCondition = 'bullish';
  else if (avgChange < -5) marketCondition = 'bearish';
  else if (avgChange > 2) marketCondition = 'slightly_bullish';
  else if (avgChange < -2) marketCondition = 'slightly_bearish';

  // Determine volatility level
  let volatilityLevel = 'low';
  if (volatility > 10) volatilityLevel = 'high';
  else if (volatility > 5) volatilityLevel = 'medium';

  // Generate trading recommendation
  let recommendation = '';
  if (marketCondition === 'bullish') {
    recommendation = 'Good time for DCA entries. Consider slightly higher allocations to growth tokens.';
  } else if (marketCondition === 'bearish') {
    recommendation = 'Market is down. Good DCA opportunity but consider higher stablecoin reserves.';
  } else if (volatilityLevel === 'high') {
    recommendation = 'High volatility detected. Consider smaller position sizes and gradual entries.';
  } else {
    recommendation = 'Stable market conditions. Good for standard DCA strategies.';
  }

  return {
    marketCondition,
    volatility: volatilityLevel,
    avgChange24h: avgChange.toFixed(2),
    recommendation,
    topPerformer: getTopPerformer(marketData),
    mostVolatile: getMostVolatile(marketData)
  };
}

/**
 * Get the top performing token
 * @param {Object} marketData - Token market data
 * @returns {Object} Top performer info
 */
function getTopPerformer(marketData) {
  let topToken = null;
  let topChange = -Infinity;

  for (const [token, data] of Object.entries(marketData)) {
    if (token !== 'USDC' && token !== 'USDT' && token !== 'DAI' && data.change24h > topChange) {
      topChange = data.change24h;
      topToken = token;
    }
  }

  return topToken ? { token: topToken, change: topChange.toFixed(2) } : null;
}

/**
 * Get the most volatile token
 * @param {Object} marketData - Token market data
 * @returns {Object} Most volatile token info
 */
function getMostVolatile(marketData) {
  let mostVolatileToken = null;
  let highestVolatility = 0;

  for (const [token, data] of Object.entries(marketData)) {
    const volatility = Math.abs(data.change24h);
    if (token !== 'USDC' && token !== 'USDT' && token !== 'DAI' && volatility > highestVolatility) {
      highestVolatility = volatility;
      mostVolatileToken = token;
    }
  }

  return mostVolatileToken ? { token: mostVolatileToken, volatility: highestVolatility.toFixed(2) } : null;
}

/**
 * Get formatted market data string for AI prompt
 * @param {Object} marketData - Market data object
 * @returns {string} Formatted market data string
 */
function formatMarketDataForAI(marketData) {
  if (!marketData || !marketData.tokens) {
    return 'MARKET DATA: Unable to fetch live market data. Use default strategy settings.';
  }

  let formatted = `📊 LIVE MARKET DATA (${marketData.timestamp}):\n`;
  
  // Token prices and changes
  formatted += `TOKEN PRICES & 24H CHANGES:\n`;
  for (const [token, data] of Object.entries(marketData.tokens)) {
    const changeSymbol = data.change24h >= 0 ? '+' : '';
    const changeColor = data.change24h >= 0 ? '🟢' : '🔴';
    formatted += `- ${token}: $${data.price.toFixed(data.price < 1 ? 6 : 2)} (${changeSymbol}${data.change24h.toFixed(2)}%) ${changeColor}\n`;
  }

  // Market summary
  formatted += `\nMARKET SUMMARY:\n`;
  formatted += `- Market Condition: ${marketData.summary.marketCondition.toUpperCase()}\n`;
  formatted += `- Volatility: ${marketData.summary.volatility.toUpperCase()}\n`;
  formatted += `- Average Change: ${marketData.summary.avgChange24h}%\n`;
  
  if (marketData.summary.topPerformer) {
    formatted += `- Top Performer: ${marketData.summary.topPerformer.token} (+${marketData.summary.topPerformer.change}%)\n`;
  }
  
  if (marketData.summary.mostVolatile) {
    formatted += `- Most Volatile: ${marketData.summary.mostVolatile.token} (${marketData.summary.mostVolatile.volatility}%)\n`;
  }

  formatted += `\n💡 MARKET RECOMMENDATION: ${marketData.summary.recommendation}\n`;
  
  return formatted;
}

module.exports = {
  fetchMarketData,
  fetchHederaTokenData,
  formatMarketDataForAI,
  generateMarketSummary
}; 