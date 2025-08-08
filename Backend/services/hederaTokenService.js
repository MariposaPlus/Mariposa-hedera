const fs = require('fs');
const path = require('path');
const axios = require('axios');

class HederaTokenService {
  constructor() {
    this.tokensData = null;
    this.loadTokensData();
  }

  /**
   * Load tokens data from tokens.json file
   */
  loadTokensData() {
    try {
      const tokensPath = path.join(__dirname, '../../tokens.json');
      const tokensFile = fs.readFileSync(tokensPath, 'utf8');
      this.tokensData = JSON.parse(tokensFile);
      console.log(`✅ Loaded ${this.tokensData.length} Hedera tokens`);
    } catch (error) {
      console.error('❌ Error loading tokens data:', error);
      this.tokensData = [];
    }
  }

  /**
   * Get all available Hedera tokens
   * @returns {Array} Array of token objects
   */
  getAllTokens() {
    return this.tokensData || [];
  }

  /**
   * Search tokens by symbol, name, or ID
   * @param {string} query - Search query
   * @returns {Array} Matching tokens
   */
  searchTokens(query) {
    if (!this.tokensData) return [];
    
    const searchTerm = query.toLowerCase();
    return this.tokensData.filter(token => 
      token.symbol.toLowerCase().includes(searchTerm) ||
      token.name.toLowerCase().includes(searchTerm) ||
      token.id.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get token by ID
   * @param {string} tokenId - Token ID (e.g., "0.0.1456986")
   * @returns {Object|null} Token object or null if not found
   */
  getTokenById(tokenId) {
    if (!this.tokensData) return null;
    return this.tokensData.find(token => token.id === tokenId) || null;
  }

  /**
   * Get top tokens by market cap or volume
   * @param {number} limit - Number of tokens to return
   * @param {string} sortBy - 'priceUsd' or 'inTopPools'
   * @returns {Array} Top tokens
   */
  getTopTokens(limit = 10, sortBy = 'priceUsd') {
    if (!this.tokensData) return [];
    
    let sortedTokens;
    if (sortBy === 'priceUsd') {
      sortedTokens = this.tokensData
        .filter(token => token.priceUsd > 0)
        .sort((a, b) => b.priceUsd - a.priceUsd);
    } else if (sortBy === 'inTopPools') {
      sortedTokens = this.tokensData
        .filter(token => token.inTopPools)
        .sort((a, b) => b.priceUsd - a.priceUsd);
    }
    
    return sortedTokens.slice(0, limit);
  }

  /**
   * Get live market data from GeckoTerminal API
   * @param {string} tokenAddress - Token address
   * @returns {Object} Live market data
   */
  async getLiveTokenData(tokenAddress) {
    try {
      const response = await axios.get(
        `https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/tokens/${tokenAddress}`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HederaTokenService/1.0'
          }
        }
      );
      
      return {
        success: true,
        data: response.data.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Error fetching live data for ${tokenAddress}:`, error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.getTokenById(tokenAddress)
      };
    }
  }

  /**
   * Get token pools data from GeckoTerminal API
   * @param {string} tokenAddress - Token address
   * @returns {Object} Token pools data
   */
  async getTokenPools(tokenAddress) {
    try {
      const response = await axios.get(
        `https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/tokens/${tokenAddress}/pools`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HederaTokenService/1.0'
          }
        }
      );
      
      return {
        success: true,
        data: response.data.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Error fetching pools for ${tokenAddress}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze token for investment potential
   * @param {string} tokenId - Token ID
   * @returns {Object} Analysis result
   */
  async analyzeToken(tokenId) {
    const token = this.getTokenById(tokenId);
    if (!token) {
      return {
        success: false,
        error: 'Token not found in Hedera network'
      };
    }

    // Get live data
    const liveData = await this.getLiveTokenData(tokenId);
    const poolsData = await this.getTokenPools(tokenId);

    // Perform analysis
    const analysis = {
      token: {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals
      },
      marketData: {
        currentPrice: token.priceUsd,
        dueDiligenceComplete: token.dueDiligenceComplete,
        inTopPools: token.inTopPools,
        inV2Pools: token.inV2Pools,
        isFeeOnTransferToken: token.isFeeOnTransferToken
      },
      liveData: liveData.success ? liveData.data : null,
      poolsData: poolsData.success ? poolsData.data : null,
      riskAssessment: this.assessRisk(token),
      recommendation: this.generateRecommendation(token, liveData, poolsData)
    };

    return {
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Assess risk level of a token
   * @param {Object} token - Token object
   * @returns {Object} Risk assessment
   */
  assessRisk(token) {
    let riskScore = 0;
    const factors = [];

    // Due diligence check
    if (!token.dueDiligenceComplete) {
      riskScore += 30;
      factors.push('Due diligence not completed');
    }

    // Fee on transfer check
    if (token.isFeeOnTransferToken) {
      riskScore += 20;
      factors.push('Fee on transfer token');
    }

    // Liquidity check
    if (!token.inTopPools && !token.inV2Pools) {
      riskScore += 25;
      factors.push('Low liquidity');
    }

    // Price check
    if (token.priceUsd === 0) {
      riskScore += 25;
      factors.push('No price data available');
    }

    let riskLevel;
    if (riskScore <= 20) riskLevel = 'Low';
    else if (riskScore <= 50) riskLevel = 'Medium';
    else if (riskScore <= 75) riskLevel = 'High';
    else riskLevel = 'Very High';

    return {
      score: riskScore,
      level: riskLevel,
      factors
    };
  }

  /**
   * Generate investment recommendation
   * @param {Object} token - Token object
   * @param {Object} liveData - Live market data
   * @param {Object} poolsData - Pools data
   * @returns {Object} Recommendation
   */
  generateRecommendation(token, liveData, poolsData) {
    const risk = this.assessRisk(token);
    let recommendation = 'HOLD';
    let reasoning = [];

    // Positive factors
    if (token.dueDiligenceComplete) {
      reasoning.push('✅ Due diligence completed');
    }
    if (token.inTopPools) {
      reasoning.push('✅ Listed in top pools');
    }
    if (token.priceUsd > 0.01) {
      reasoning.push('✅ Established price above $0.01');
    }

    // Negative factors
    if (risk.level === 'Very High') {
      recommendation = 'AVOID';
      reasoning.push('❌ Very high risk profile');
    } else if (risk.level === 'High') {
      recommendation = 'CAUTION';
      reasoning.push('⚠️ High risk - proceed with caution');
    }

    // Live data analysis
    if (liveData.success && liveData.data) {
      reasoning.push('📊 Live market data available');
    }

    return {
      action: recommendation,
      reasoning,
      riskLevel: risk.level,
      confidence: risk.level === 'Low' ? 'High' : risk.level === 'Medium' ? 'Medium' : 'Low'
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    const totalTokens = this.tokensData ? this.tokensData.length : 0;
    const topPoolTokens = this.tokensData ? this.tokensData.filter(t => t.inTopPools).length : 0;
    const dueDiligenceComplete = this.tokensData ? this.tokensData.filter(t => t.dueDiligenceComplete).length : 0;

    return {
      totalTokens,
      topPoolTokens,
      dueDiligenceComplete,
      lastUpdated: new Date().toISOString(),
      apiEndpoints: {
        tokenData: 'https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/tokens/{address}',
        poolsData: 'https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/tokens/{address}/pools'
      }
    };
  }
}

// Export singleton instance
const hederaTokenService = new HederaTokenService();
module.exports = hederaTokenService;