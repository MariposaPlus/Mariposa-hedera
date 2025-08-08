const axios = require('axios');

class SeiMarketDataService {
  constructor() {
    this.baseUrl = 'https://api.geckoterminal.com/api/v2/networks/sei-evm';
    this.supportedTokens = [
      {
        "id": "0x160345fc359604fc6e70e3c5facbde5f7a9342d8",
        "name": "WETH",
        "symbol": "WETH",
        "url": "https://sailor.finance/images/coins/weth.png",
        "decimals": "18",
        "verified": true,
        "price": "3674.19000000",
        "dailychange": "-4.203"
      },
      {
        "id": "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7",
        "name": "Wrapped SEI",
        "symbol": "WSEI",
        "url": "https://dzyb4dm7r8k8w.cloudfront.net/prod/logos/0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7/logo.png",
        "decimals": "18",
        "verified": true,
        "price": "0.33950000",
        "dailychange": "-6.910"
      },
      {
        "id": "0x805679729df385815c57c24b20f4161bd34b655f",
        "name": "Fishwar",
        "symbol": "FISHW",
        "url": "https://storage.googleapis.com/app-sailor/fishwar.png",
        "decimals": "18",
        "verified": true,
        "price": "0.10000000",
        "dailychange": "0.000"
      },
      {
        "id": "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1",
        "name": "USDC",
        "symbol": "USDC",
        "url": "https://dzyb4dm7r8k8w.cloudfront.net/prod/logos/0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1/logo.png",
        "decimals": "6",
        "verified": true,
        "price": "1.00000000",
        "dailychange": "0.000"
      },
      {
        "id": "0x9151434b16b9763660705744891fa906f660ecc5",
        "name": "USDT",
        "symbol": "USDT",
        "url": "https://raw.githubusercontent.com/Seitrace/sei-assetlist/main/images/usdt0.png",
        "decimals": "6",
        "verified": true,
        "price": "1.00000000",
        "dailychange": "0.000"
      },
      {
        "id": "0x5cf6826140c1c56ff49c808a1a75407cd1df9423",
        "name": "iSEI",
        "symbol": "iSEI",
        "url": "https://dzyb4dm7r8k8w.cloudfront.net/prod/logos/0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423/logo.png",
        "decimals": "6",
        "verified": true,
        "price": "0.33950000",
        "dailychange": "-6.910"
      },
      {
        "id": "0x0555e30da8f98308edb960aa94c0db47230d2b9c",
        "name": "Wrapped BTC",
        "symbol": "WBTC",
        "url": "https://sailor.finance/images/coins/wbtc.png",
        "decimals": "8",
        "verified": true,
        "price": "118604.10000000",
        "dailychange": "-0.113"
      },
      {
        "id": "0x78e26e8b953c7c78a58d69d8b9a91745c2bbb258",
        "name": "uBTC",
        "symbol": "uBTC",
        "url": "https://www.geckoterminal.com/_next/image?url=https%3A%2F%2Fassets.geckoterminal.com%2Fjhsuvluz0eq3jq39k0aw8kth7pmm&w=64&q=75",
        "decimals": "18",
        "verified": true,
        "price": "118000.00000000",
        "dailychange": "-0.200"
      },
      {
        "id": "0x541fd749419ca806a8bc7da8ac23d346f2df8b77",
        "name": "Solv BTC",
        "symbol": "SolvBTC",
        "url": "https://storage.googleapis.com/app-sailor/SolvBTC.png",
        "decimals": "18",
        "verified": true,
        "price": "118200.00000000",
        "dailychange": "-0.150"
      },
      {
        "id": "0x3aade831c3a01489060e5da6df9036b795783b60",
        "name": "SEICAT",
        "symbol": "SEICAT",
        "url": "https://seitrace.com/icons/token-placeholder.svg",
        "decimals": "18",
        "verified": false,
        "price": "0.00010000",
        "dailychange": "5.000"
      },
      {
        "id": "0x290fd8261af9dc3f084725f799dc12f86ad5240a",
        "name": "SEIKING",
        "symbol": "SEIKING",
        "url": "https://seitrace.com/icons/token-placeholder.svg",
        "decimals": "18",
        "verified": false,
        "price": "0.00005000",
        "dailychange": "10.000"
      },
      {
        "id": "0xb75d0b03c06a926e488e2659df1a861f860bd3d1",
        "name": "kavaUSDT",
        "symbol": "kavaUSDT",
        "url": "https://storage.googleapis.com/app-sailor/kavaUSDT.jpg",
        "decimals": "6",
        "verified": true,
        "price": "1.00000000",
        "dailychange": "0.000"
      },
      {
        "id": "0xcc0966d8418d412c599a6421b760a847eb169a8c",
        "name": "SolvBTC Babylon",
        "symbol": "SolvBTC.BBN",
        "url": "https://sailor.finance/xSolvBTC.png",
        "decimals": "18",
        "verified": true,
        "price": "118300.00000000",
        "dailychange": "-0.100"
      },
      {
        "id": "0xc30cdbf2512ee4bd2f8708a07606c9a69bcc1dc1",
        "name": "SEIDOG",
        "symbol": "SEIDOG",
        "url": "https://seitrace.com/icons/token-placeholder.svg",
        "decimals": "18",
        "verified": false,
        "price": "0.00008000",
        "dailychange": "8.000"
      },
      {
        "id": "0x0814f0476b6686630df19b7c86c3ec41ce8676c0",
        "name": "MAD",
        "symbol": "MAD",
        "url": "https://storage.googleapis.com/app-sailor/mad.jpg",
        "decimals": "18",
        "verified": true,
        "price": "0.50000000",
        "dailychange": "2.000"
      },
      {
        "id": "0xcbab11cf275011ce85d9b93c236a4844eca13cdd",
        "name": "MOONSEI",
        "symbol": "MOONSEI",
        "url": "https://seitrace.com/icons/token-placeholder.svg",
        "decimals": "18",
        "verified": false,
        "price": "0.00015000",
        "dailychange": "15.000"
      },
      {
        "id": "0xff12470a969dd362eb6595ffb44c82c959fe9acc",
        "name": "USDa",
        "symbol": "USDa",
        "url": "https://729569225-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FlcdCcIXgWo7dKoZEUxKp%2Fuploads%2FC3rBj7o0RhyZ7mSRppBC%2FUSDa.png?alt=media&token=a4735826-4925-4f78-9842-f56b6e6cd982",
        "decimals": "18",
        "verified": true,
        "price": "1.00000000",
        "dailychange": "0.000"
      },
      {
        "id": "0x059a6b0ba116c63191182a0956cf697d0d2213ec",
        "name": "Synnax Stablecoin",
        "symbol": "syUSD",
        "url": "https://assets.coingecko.com/coins/images/50179/standard/7.png?1726164913",
        "decimals": "18",
        "verified": true,
        "price": "1.00000000",
        "dailychange": "0.000"
      },
      {
        "id": "0x6ab5d5e96ac59f66bab57450275cc16961219796",
        "name": "USDa saving token",
        "symbol": "sUSDa",
        "url": "https://729569225-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FlcdCcIXgWo7dKoZEUxKp%2Fuploads%2Fvl6qQIG4mONwxo1QO7WR%2FsUSDa.png?alt=media&token=57cd569a-8dde-4f77-bb97-3445331662e2",
        "decimals": "18",
        "verified": true,
        "price": "1.05000000",
        "dailychange": "0.500"
      },
      {
        "id": "0x0000000000000000000000000000000000000000",
        "name": "SEI",
        "symbol": "SEI",
        "url": "https://dzyb4dm7r8k8w.cloudfront.net/prod/logos/0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7/logo.png",
        "decimals": 18,
        "verified": true,
        "price": "0.33950000",
        "dailychange": "-6.910"
      },
      {
        "id": "0x64445f0aecC51E94aD52d8AC56b7190e764E561a",
        "name": "Frax Share",
        "symbol": "FXS",
        "url": "https://dzyb4dm7r8k8w.cloudfront.net/prod/logos/0x64445f0aecC51E94aD52d8AC56b7190e764E561a/logo.png",
        "decimals": 18,
        "verified": true,
        "price": "3.50000000",
        "dailychange": "1.500"
      },
      {
        "id": "0x37a4dD9CED2b19Cfe8FAC251cd727b5787E45269",
        "name": "fastUSD",
        "symbol": "FASTUSD",
        "url": "https://dzyb4dm7r8k8w.cloudfront.net/prod/logos/0x37a4dD9CED2b19Cfe8FAC251cd727b5787E45269/logo.png",
        "decimals": 18,
        "verified": true,
        "price": "1.00000000",
        "dailychange": "0.000"
      }
    ];
  }

  /**
   * Fetch pools data for a specific token from GeckoTerminal
   * @param {string} tokenAddress - The token contract address
   * @returns {Promise<Array>} Array of pool data filtered for Sailor DEX only
   */
  async fetchTokenPools(tokenAddress) {
    try {
      const url = `${this.baseUrl}/tokens/${tokenAddress}/pools?page=1`;
      console.log(`🦎 Fetching pools for token ${tokenAddress} from GeckoTerminal...`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SeiAgent/1.0'
        }
      });

      if (!response.data || !response.data.data) {
        console.warn(`⚠️  No pool data found for token ${tokenAddress}`);
        return [];
      }

      // Filter only Sailor DEX pools
      const sailorPools = response.data.data.filter(pool => {
        return pool.relationships?.dex?.data?.id === 'sailor';
      });

      console.log(`✅ Found ${sailorPools.length} Sailor pools for token ${tokenAddress}`);
      return sailorPools;

    } catch (error) {
      console.error(`❌ Error fetching pools for token ${tokenAddress}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch comprehensive market data for all supported SEI tokens
   * @returns {Promise<Object>} Complete market data for all tokens
   */
  async fetchAllSeiMarketData() {
    try {
      console.log('\n🌊 FETCHING COMPREHENSIVE SEI MARKET DATA');
      console.log('═'.repeat(80));

      const marketData = {
        timestamp: new Date().toISOString(),
        network: 'sei-evm',
        dex: 'sailor',
        tokens: {},
        summary: {
          totalTokens: this.supportedTokens.length,
          totalPools: 0,
          avgVolume24h: 0,
          topPerformer: null,
          bottomPerformer: null
        }
      };

      // Fetch pool data for each supported token
      const poolPromises = this.supportedTokens.map(async (token) => {
        const pools = await this.fetchTokenPools(token.id);
        
        // Process pools data
        const processedPools = pools.map(pool => ({
          id: pool.id,
          address: pool.attributes.address,
          name: pool.attributes.name,
          baseTokenPriceUsd: parseFloat(pool.attributes.base_token_price_usd || 0),
          quoteTokenPriceUsd: parseFloat(pool.attributes.quote_token_price_usd || 0),
          tokenPriceUsd: parseFloat(pool.attributes.token_price_usd || 0),
          fdvUsd: parseFloat(pool.attributes.fdv_usd || 0),
          marketCapUsd: pool.attributes.market_cap_usd,
          priceChangePercentage: {
            m5: parseFloat(pool.attributes.price_change_percentage?.m5 || 0),
            m15: parseFloat(pool.attributes.price_change_percentage?.m15 || 0),
            m30: parseFloat(pool.attributes.price_change_percentage?.m30 || 0),
            h1: parseFloat(pool.attributes.price_change_percentage?.h1 || 0),
            h6: parseFloat(pool.attributes.price_change_percentage?.h6 || 0),
            h24: parseFloat(pool.attributes.price_change_percentage?.h24 || 0)
          },
          volume24h: parseFloat(pool.attributes.volume_usd?.h24 || 0),
          volume6h: parseFloat(pool.attributes.volume_usd?.h6 || 0),
          volume1h: parseFloat(pool.attributes.volume_usd?.h1 || 0),
          reserveUsd: parseFloat(pool.attributes.reserve_in_usd || 0),
          transactions24h: {
            buys: pool.attributes.transactions?.h24?.buys || 0,
            sells: pool.attributes.transactions?.h24?.sells || 0,
            buyers: pool.attributes.transactions?.h24?.buyers || 0,
            sellers: pool.attributes.transactions?.h24?.sellers || 0
          },
          poolCreatedAt: pool.attributes.pool_created_at,
          baseToken: pool.relationships?.base_token?.data?.id,
          quoteToken: pool.relationships?.quote_token?.data?.id
        }));

        // Calculate token metrics
        const totalVolume24h = processedPools.reduce((sum, pool) => sum + pool.volume24h, 0);
        const avgPrice = processedPools.length > 0 ? 
          processedPools.reduce((sum, pool) => sum + pool.tokenPriceUsd, 0) / processedPools.length : 0;
        const bestPool = processedPools.reduce((best, pool) => 
          pool.volume24h > (best?.volume24h || 0) ? pool : best, null);

        return {
          symbol: token.symbol,
          address: token.id,
          fallbackPrice: parseFloat(token.price),
          fallbackDailyChange: parseFloat(token.dailychange),
          pools: processedPools,
          metrics: {
            totalPools: processedPools.length,
            totalVolume24h: totalVolume24h,
            avgPrice: avgPrice,
            bestPool: bestPool,
            priceChange24h: bestPool?.priceChangePercentage?.h24 || parseFloat(token.dailychange),
            liquidityScore: processedPools.reduce((sum, pool) => sum + pool.reserveUsd, 0)
          }
        };
      });

      const tokenResults = await Promise.all(poolPromises);

      // Organize results by token symbol
      tokenResults.forEach(tokenData => {
        marketData.tokens[tokenData.symbol] = tokenData;
        marketData.summary.totalPools += tokenData.metrics.totalPools;
      });

      // Calculate summary metrics
      const tokenMetrics = Object.values(marketData.tokens);
      marketData.summary.avgVolume24h = tokenMetrics.reduce((sum, token) => 
        sum + token.metrics.totalVolume24h, 0) / tokenMetrics.length;

      // Find top and bottom performers
      const sortedByPerformance = tokenMetrics.sort((a, b) => 
        b.metrics.priceChange24h - a.metrics.priceChange24h);
      marketData.summary.topPerformer = sortedByPerformance[0]?.symbol;
      marketData.summary.bottomPerformer = sortedByPerformance[sortedByPerformance.length - 1]?.symbol;

      console.log('✅ MARKET DATA FETCH COMPLETED');
      console.log(`📊 Total Pools Found: ${marketData.summary.totalPools}`);
      console.log(`📈 Top Performer: ${marketData.summary.topPerformer}`);
      console.log(`📉 Bottom Performer: ${marketData.summary.bottomPerformer}`);
      console.log(`💰 Average 24h Volume: $${marketData.summary.avgVolume24h.toFixed(2)}`);

      return marketData;

    } catch (error) {
      console.error('❌ Error fetching SEI market data:', error.message);
      
      // Return fallback data based on supported tokens
      return {
        timestamp: new Date().toISOString(),
        network: 'sei-evm',
        dex: 'sailor',
        error: error.message,
        tokens: this.supportedTokens.reduce((acc, token) => {
          acc[token.symbol] = {
            symbol: token.symbol,
            address: token.id,
            fallbackPrice: parseFloat(token.price),
            fallbackDailyChange: parseFloat(token.dailychange),
            pools: [],
            metrics: {
              totalPools: 0,
              totalVolume24h: 0,
              avgPrice: parseFloat(token.price),
              bestPool: null,
              priceChange24h: parseFloat(token.dailychange),
              liquidityScore: 0
            }
          };
          return acc;
        }, {}),
        summary: {
          totalTokens: this.supportedTokens.length,
          totalPools: 0,
          avgVolume24h: 0,
          topPerformer: null,
          bottomPerformer: null,
          usingFallback: true
        }
      };
    }
  }

  /**
   * Get market insights text for AI prompts
   * @param {Object} marketData - Market data from fetchAllSeiMarketData
   * @returns {string} Formatted market insights for AI consumption
   */
  generateMarketInsights(marketData) {
    try {
      let insights = `🌊 REAL-TIME SEI MARKET DATA (${marketData.timestamp})\n`;
      insights += `Network: ${marketData.network} | DEX: ${marketData.dex}\n\n`;

      if (marketData.summary.usingFallback) {
        insights += `⚠️  Using fallback data due to API limitations\n\n`;
      }

      insights += `📊 MARKET SUMMARY:\n`;
      insights += `• Total Active Pools: ${marketData.summary.totalPools}\n`;
      insights += `• Average 24h Volume: $${marketData.summary.avgVolume24h.toFixed(2)}\n`;
      if (marketData.summary.topPerformer) {
        insights += `• Top Performer: ${marketData.summary.topPerformer}\n`;
      }
      if (marketData.summary.bottomPerformer) {
        insights += `• Bottom Performer: ${marketData.summary.bottomPerformer}\n`;
      }

      insights += `\n💰 TOKEN DETAILS:\n`;
      
      // Group tokens by category for better organization
      const majorTokens = ['WETH', 'WBTC', 'SEI', 'WSEI'];
      const stablecoins = ['USDC', 'USDT', 'USDa', 'syUSD', 'FASTUSD', 'kavaUSDT', 'sUSDa'];
      const btcVariants = ['uBTC', 'SolvBTC', 'SolvBTC.BBN'];
      const defiTokens = ['iSEI', 'FXS', 'MAD'];
      const memeTokens = ['SEICAT', 'SEIKING', 'SEIDOG', 'MOONSEI'];
      const gameTokens = ['FISHW'];

      // Show major tokens first
      const majorTokenData = Object.entries(marketData.tokens).filter(([symbol]) => majorTokens.includes(symbol));
      if (majorTokenData.length > 0) {
        insights += `\n🔥 MAJOR TOKENS:\n`;
        majorTokenData.forEach(([symbol, data]) => {
          insights += `${symbol}: $${data.metrics.avgPrice > 0 ? data.metrics.avgPrice.toFixed(data.symbol === 'SEI' || data.symbol === 'WSEI' ? 5 : 2) : data.fallbackPrice} (${data.metrics.priceChange24h.toFixed(2)}%) - ${data.metrics.totalPools} pools, $${data.metrics.totalVolume24h.toFixed(0)} volume\n`;
        });
      }

      // Show stablecoins
      const stablecoinData = Object.entries(marketData.tokens).filter(([symbol]) => stablecoins.includes(symbol));
      if (stablecoinData.length > 0) {
        insights += `\n💰 STABLECOINS:\n`;
        stablecoinData.forEach(([symbol, data]) => {
          insights += `${symbol}: $${data.metrics.avgPrice > 0 ? data.metrics.avgPrice.toFixed(4) : data.fallbackPrice} (${data.metrics.priceChange24h.toFixed(2)}%) - ${data.metrics.totalPools} pools, $${data.metrics.totalVolume24h.toFixed(0)} volume\n`;
        });
      }

             // Show BTC variants
       const btcVariantData = Object.entries(marketData.tokens).filter(([symbol]) => btcVariants.includes(symbol));
       if (btcVariantData.length > 0) {
         insights += `\n₿ BTC VARIANTS:\n`;
         btcVariantData.forEach(([symbol, data]) => {
           insights += `${symbol}: $${data.metrics.avgPrice > 0 ? data.metrics.avgPrice.toFixed(2) : data.fallbackPrice} (${data.metrics.priceChange24h.toFixed(2)}%) - ${data.metrics.totalPools} pools, $${data.metrics.totalVolume24h.toFixed(0)} volume\n`;
         });
       }

      // Show DeFi tokens
      const defiData = Object.entries(marketData.tokens).filter(([symbol]) => defiTokens.includes(symbol));
      if (defiData.length > 0) {
        insights += `\n🏦 DeFi TOKENS:\n`;
        defiData.forEach(([symbol, data]) => {
          insights += `${symbol}: $${data.metrics.avgPrice > 0 ? data.metrics.avgPrice.toFixed(4) : data.fallbackPrice} (${data.metrics.priceChange24h.toFixed(2)}%) - ${data.metrics.totalPools} pools, $${data.metrics.totalVolume24h.toFixed(0)} volume\n`;
        });
      }

      // Show high-performing tokens only (limit output for readability)
      const otherTokens = Object.entries(marketData.tokens).filter(([symbol]) => 
        !majorTokens.includes(symbol) && !stablecoins.includes(symbol) && 
        !btcVariants.includes(symbol) && !defiTokens.includes(symbol)
      ).filter(([symbol, data]) => data.metrics.totalVolume24h > 1000 || Math.abs(data.metrics.priceChange24h) > 5);
      
      if (otherTokens.length > 0) {
        insights += `\n🎯 HIGH ACTIVITY TOKENS:\n`;
        otherTokens.slice(0, 5).forEach(([symbol, data]) => {
          insights += `${symbol}: $${data.metrics.avgPrice > 0 ? data.metrics.avgPrice.toFixed(6) : data.fallbackPrice} (${data.metrics.priceChange24h.toFixed(2)}%) - ${data.metrics.totalPools} pools, $${data.metrics.totalVolume24h.toFixed(0)} volume\n`;
        });
      }

             insights += `\n🎯 TRADING INSIGHTS:\n`;
       const wethData = marketData.tokens.WETH;
       const wbtcData = marketData.tokens.WBTC;
       const seiData = marketData.tokens.SEI;
       const wseiData = marketData.tokens.WSEI;
       const usdcData = marketData.tokens.USDC;

       if (seiData && seiData.metrics.priceChange24h < -5) {
         insights += `• SEI experiencing significant decline (${seiData.metrics.priceChange24h.toFixed(2)}%) - potential DCA opportunity\n`;
       }
       if (wbtcData && wbtcData.metrics.priceChange24h > 2) {
         insights += `• WBTC showing strong performance (${wbtcData.metrics.priceChange24h.toFixed(2)}%) - momentum strategy consideration\n`;
       }
       if (wethData && wethData.metrics.priceChange24h < -3) {
         insights += `• WETH experiencing weakness (${wethData.metrics.priceChange24h.toFixed(2)}%) - swing trading opportunity\n`;
       }
       if (wseiData && wseiData.metrics.priceChange24h < -5) {
         insights += `• WSEI declining (${wseiData.metrics.priceChange24h.toFixed(2)}%) - consider for accumulation\n`;
       }

       // Check for high-performing meme tokens
       const memeTokenPerformers = Object.entries(marketData.tokens).filter(([symbol, data]) => 
         memeTokens.includes(symbol) && Math.abs(data.metrics.priceChange24h) > 10);
       if (memeTokenPerformers.length > 0) {
         insights += `• High volatility meme tokens: ${memeTokenPerformers.map(([symbol, data]) => 
           `${symbol} (${data.metrics.priceChange24h.toFixed(1)}%)`).join(', ')} - high risk/reward\n`;
       }

      // Volume analysis
      const totalVolume = Object.values(marketData.tokens).reduce((sum, token) => sum + token.metrics.totalVolume24h, 0);
      if (totalVolume > 100000) {
        insights += `• High market activity ($${totalVolume.toFixed(0)} 24h volume) - good liquidity for trading\n`;
      } else if (totalVolume < 50000) {
        insights += `• Lower market activity ($${totalVolume.toFixed(0)} 24h volume) - consider DCA over active trading\n`;
      }

      insights += `\n⚡ REAL-TIME RECOMMENDATION:\n`;
      if (marketData.summary.usingFallback) {
        insights += `• Market data limited - use conservative strategies like DCA\n`;
      } else {
        const avgChange = Object.values(marketData.tokens).reduce((sum, token) => sum + token.metrics.priceChange24h, 0) / 4;
        if (avgChange < -2) {
          insights += `• Overall market declining (${avgChange.toFixed(2)}% avg) - DCA or buying dips recommended\n`;
        } else if (avgChange > 2) {
          insights += `• Overall market rising (${avgChange.toFixed(2)}% avg) - momentum or swing trading viable\n`;
        } else {
          insights += `• Market relatively stable (${avgChange.toFixed(2)}% avg) - all strategies viable\n`;
        }
      }

      return insights;

    } catch (error) {
      console.error('Error generating market insights:', error);
      return `⚠️  Market data analysis unavailable due to: ${error.message}`;
    }
  }

  /**
   * Get supported tokens list
   * @returns {Array} List of supported tokens
   */
  getSupportedTokens() {
    return this.supportedTokens;
  }

  /**
   * Check if a token is supported
   * @param {string} symbol - Token symbol to check
   * @returns {boolean} True if token is supported
   */
  isSupportedToken(symbol) {
    return this.supportedTokens.some(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase());
  }

  /**
   * Get token info by symbol
   * @param {string} symbol - Token symbol
   * @returns {Object|null} Token info or null if not found
   */
  getTokenInfo(symbol) {
    return this.supportedTokens.find(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase()) || null;
  }

  /**
   * Get formatted list of supported tokens for AI prompts
   * @returns {string} Formatted token list with categories
   */
  getFormattedTokenList() {
    const majorTokens = this.supportedTokens.filter(t => ['WETH', 'WBTC', 'SEI', 'WSEI'].includes(t.symbol));
    const stablecoins = this.supportedTokens.filter(t => ['USDC', 'USDT', 'USDa', 'syUSD', 'FASTUSD', 'kavaUSDT', 'sUSDa'].includes(t.symbol));
    const btcVariants = this.supportedTokens.filter(t => ['uBTC', 'SolvBTC', 'SolvBTC.BBN'].includes(t.symbol));
    const defiTokens = this.supportedTokens.filter(t => ['iSEI', 'FXS', 'MAD'].includes(t.symbol));
    const otherTokens = this.supportedTokens.filter(t => ['FISHW'].includes(t.symbol));

    let tokenList = `SUPPORTED SEI NETWORK TOKENS (${this.supportedTokens.length} total):\n\n`;
    
    tokenList += `🔥 MAJOR TOKENS: ${majorTokens.map(t => t.symbol).join(', ')}\n`;
    tokenList += `💰 STABLECOINS: ${stablecoins.map(t => t.symbol).join(', ')}\n`;
    tokenList += `₿ BTC VARIANTS: ${btcVariants.map(t => t.symbol).join(', ')}\n`;
    tokenList += `🏦 DeFi TOKENS: ${defiTokens.map(t => t.symbol).join(', ')}\n`;
    tokenList += `🎮 OTHER VERIFIED: ${otherTokens.map(t => t.symbol).join(', ')}\n\n`;
    
    tokenList += `IMPORTANT RULES:\n`;
    tokenList += `• ONLY use tokens from the above list - no other tokens exist on SEI network\n`;
    tokenList += `• Prefer verified tokens for conservative strategies\n`;
    tokenList += `• Consider token categories when building portfolios\n`;
    tokenList += `• Use stablecoins for stability, major tokens for growth\n`;
    tokenList += `• All trading must be done through Sailor DEX pools`;

    return tokenList;
  }
}

module.exports = new SeiMarketDataService(); 