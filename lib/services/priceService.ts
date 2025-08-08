/**
 * Price Service - Fetches real-time cryptocurrency prices using GeckoTerminal API
 */

interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  lastUpdated: number;
}

interface GeckoTerminalTokenData {
  id: string;
  type: string;
  attributes: {
    name: string;
    symbol: string;
    price_usd: string;
    price_change_percentage: {
      h24: string;
    };
  };
}

interface GeckoTerminalResponse {
  data: GeckoTerminalTokenData;
}

export class PriceService {
  private static cache: Map<string, PriceData> = new Map();
  private static CACHE_DURATION = 60000; // 1 minute cache
  
  // HBAR/WHBAR token address on Hedera testnet (from tokenstestnetSwap.json)
  private static HBAR_TOKEN_ADDRESS = '0.0.15058'; // WHBAR[new] token ID

  /**
   * Fetch HBAR price from GeckoTerminal API (using same backend implementation)
   */
  static async getHBARPrice(): Promise<PriceData> {
    const cacheKey = 'HBAR';
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
      return cached;
    }

    try {
      console.log('💰 Fetching real-time HBAR price from GeckoTerminal...');
      
      const response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/tokens/${this.HBAR_TOKEN_ADDRESS}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HederaPriceService/1.0'
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GeckoTerminalResponse = await response.json();
      
      if (!data.data || !data.data.attributes) {
        throw new Error('Invalid response format from GeckoTerminal API');
      }

      const attributes = data.data.attributes;
      const price = parseFloat(attributes.price_usd);
      const change24h = parseFloat(attributes.price_change_percentage?.h24 || '0');
      
      const priceData: PriceData = {
        symbol: 'HBAR',
        price: price,
        change24h: change24h,
        lastUpdated: Date.now()
      };

      // Cache the result
      this.cache.set(cacheKey, priceData);
      
      console.log(`✅ HBAR price fetched from GeckoTerminal: $${priceData.price.toFixed(4)} (${priceData.change24h?.toFixed(2)}% 24h)`);
      
      return priceData;
    } catch (error) {
      console.error('❌ Failed to fetch HBAR price from GeckoTerminal:', error);
      
      // Return fallback price if API fails
      const fallbackPrice: PriceData = {
        symbol: 'HBAR',
        price: 0.26307363, // Updated fallback price from tokenstestnetSwap.json
        change24h: 0,
        lastUpdated: Date.now()
      };
      
      console.log('🔄 Using fallback HBAR price:', fallbackPrice.price);
      
      return fallbackPrice;
    }
  }

  /**
   * Get multiple crypto prices (for future expansion)
   */
  static async getPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const prices = new Map<string, PriceData>();
    
    // For now, only HBAR is supported via GeckoTerminal
    if (symbols.includes('HBAR')) {
      const hbarPrice = await this.getHBARPrice();
      prices.set('HBAR', hbarPrice);
    }
    
    return prices;
  }

  /**
   * Get token price by Hedera token ID (for future expansion)
   */
  static async getTokenPrice(tokenId: string): Promise<PriceData | null> {
    try {
      console.log(`💰 Fetching price for token ${tokenId} from GeckoTerminal...`);
      
      const response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/tokens/${tokenId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HederaPriceService/1.0'
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GeckoTerminalResponse = await response.json();
      
      if (!data.data || !data.data.attributes) {
        throw new Error('Invalid response format from GeckoTerminal API');
      }

      const attributes = data.data.attributes;
      const price = parseFloat(attributes.price_usd);
      const change24h = parseFloat(attributes.price_change_percentage?.h24 || '0');
      
      const priceData: PriceData = {
        symbol: attributes.symbol,
        price: price,
        change24h: change24h,
        lastUpdated: Date.now()
      };

      console.log(`✅ ${attributes.symbol} price fetched: $${priceData.price.toFixed(4)} (${priceData.change24h?.toFixed(2)}% 24h)`);
      
      return priceData;
    } catch (error) {
      console.error(`❌ Failed to fetch price for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Calculate portfolio value
   */
  static calculatePortfolioValue(holdings: { symbol: string; amount: number }[], prices: Map<string, PriceData>): number {
    return holdings.reduce((total, holding) => {
      const priceData = prices.get(holding.symbol);
      if (priceData) {
        return total + (holding.amount * priceData.price);
      }
      return total;
    }, 0);
  }

  /**
   * Format price with appropriate decimal places
   */
  static formatPrice(price: number): string {
    if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(6);
    }
  }

  /**
   * Format percentage change with color indication
   */
  static formatPriceChange(change24h: number): { formatted: string; isPositive: boolean } {
    const isPositive = change24h >= 0;
    return {
      formatted: `${isPositive ? '+' : ''}${change24h.toFixed(2)}%`,
      isPositive
    };
  }
}
