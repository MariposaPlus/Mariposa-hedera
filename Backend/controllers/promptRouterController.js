const { validationResult } = require('express-validator');
const messageClassificationService = require('../services/messageClassificationService');
const actionsProcessingService = require('../services/actionsProcessingService');
const hederaTokenService = require('../services/hederaTokenService');
const EnhancedIntentService = require('../services/enhancedIntentService');
const Agent = require('../models/Agent');
const { fetchMarketData } = require('../utils/marketData');

// Initialize Together AI for information processing
let Together;
try {
  Together = require('together-ai').default;
} catch (error) {
  console.warn('Together AI package not available - install with: npm install together-ai');
}

let together;
if (Together && process.env.TOGETHER_API_KEY) {
  try {
    together = new Together({
      apiKey: process.env.TOGETHER_API_KEY
    });
    
    // Set global instance for use in other services
    global.togetherAI = together;
    
    console.log('✅ TogetherAI initialized successfully and set globally');
  } catch (error) {
    console.error('❌ Together AI initialization failed:', error.message);
  }
} else {
  console.warn('⚠️ TogetherAI not configured. Set TOGETHER_API_KEY environment variable.');
}

// Initialize Enhanced Intent Service
const enhancedIntentService = new EnhancedIntentService();

class PromptRouterController {
  /**
   * Convert BigInt values to strings for JSON serialization
   * @param {any} obj - Object that may contain BigInt values
   * @returns {any} Object with BigInt values converted to strings
   */
  sanitizeBigInt(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeBigInt(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeBigInt(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Main prompt router endpoint - Two Layer Processing
   * Layer 1: Message Classification
   * Layer 2: Specialized LLM Processing
   */
  routePrompt = async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }
      
      const { message, userId, agentId: requestAgentId, execute = false } = req.body;
      
      let agentId = requestAgentId;
      if (agentId == "default" || agentId == "master-agent")
      {
        // Check if Agent model exists before querying
        if (!Agent) {
          throw new Error('Agent model is not properly imported');
        }
        const agent = await Agent.findOne({ userId: userId });
        if (!agent) {
          throw new Error('No agent found for this user');
        }
        agentId = agent._id;

      }
      const startTime = Date.now();

      console.log(`🚀 Prompt Router: Processing message from user ${userId || 'anonymous'}`);

      // LAYER 1: Message Classification
      console.log('📋 Layer 1: Classifying message type...');
      const classification = await messageClassificationService.classifyMessage(message);
      
      console.log(`✅ Classification: ${classification.type} (confidence: ${classification.confidence})`);
      if (classification.actionSubtype) {
        console.log(`🔧 Action Subtype: ${classification.actionSubtype}`);
      }

      // LAYER 2: Route to specialized processing based on type
      let processingResult;
      
      switch (classification.type) {
        case 'actions':
          console.log('⚡ Layer 2: Processing with Actions LLM...');
          const actionOptions = { execute, agentId };
          processingResult = await this.processActions(message, classification, actionOptions);
          break;
          
        case 'strategy':
          console.log('📈 Layer 2: Processing strategy with real-time market data...');
          const strategyOptions = { userId, agentId, execute: execute };
          processingResult = await this.processStrategy(message, classification, strategyOptions);
          break;
          
        case 'information':
          console.log('ℹ️  Layer 2: Information processing (placeholder)...');
          processingResult = await this.processInformation(message, classification);
          break;
          
        case 'feedbacks':
          console.log('💬 Layer 2: Feedback processing (placeholder)...');
          processingResult = await this.processFeedbacks(message, classification);
          break;
          
        default:
          console.log('❓ Layer 2: Unknown type, using default processing...');
          processingResult = await this.processDefault(message, classification);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✨ Prompt Router: Completed in ${processingTime}ms`);

      // Return comprehensive result
      const response = {
        success: true,
        data: {
          // Layer 1 results
          classification: {
            type: classification.type,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            keywords: classification.keywords,
            actionSubtype: classification.actionSubtype
          },
          
          // Layer 2 results  
          processing: processingResult,
          
          // Metadata
          metadata: {
            originalMessage: message,
            userId: userId || null,
            agentId: agentId ? String(agentId) : null,
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString(),
            routerVersion: '1.0.0'
          }
        }
      };

      // Sanitize BigInt values before sending response
      const sanitizedResponse = this.sanitizeBigInt(response);
      res.json(sanitizedResponse);

    } catch (error) {
      console.error('❌ Prompt Router Error:', error);
      
      const errorResponse = {
        success: false,
        message: 'Prompt routing failed',
        error: error.message,
        metadata: {
          timestamp: new Date().toISOString(),
          routerVersion: '1.0.0'
        }
      };
      
      // Sanitize BigInt values in error response
      const sanitizedErrorResponse = this.sanitizeBigInt(errorResponse);
      res.status(500).json(sanitizedErrorResponse);
    }
  }

  /**
   * Process actions type messages (IMPLEMENTED)
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @param {Object} options - Processing options
   * @returns {Object} Actions processing result
   */
  processActions = async (message, classification, options = {}) => {
    try {
      const actionResult = await actionsProcessingService.processAction(message, classification, options);
      
      return {
        type: 'actions',
        subtype: classification.actionSubtype,
        result: actionResult,
        status: 'completed',
        processingMethod: 'specialized_actions_llm'
      };
      
    } catch (error) {
      console.error('Actions processing error:', error);
      
      return {
        type: 'actions',
        subtype: classification.actionSubtype,
        result: {
          error: 'Actions processing failed',
          fallback: 'Please try rephrasing your request or contact support'
        },
        status: 'error',
        processingMethod: 'error_fallback'
      };
    }
  }

  /**
   * Process strategy type messages - AI-Powered Strategy Analysis with Metrics and Action Plans
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @param {Object} options - Processing options with userId and agentId
   * @returns {Object} Strategy processing result
   */
  processStrategy = async (message, classification, options = {}) => {
    try {
      console.log('📈 Processing strategy request with real-time market analysis...');
      console.log('📝 Strategy message:', message);
      console.log('🏷️ Classification:', classification.type, '-', classification.actionSubtype);
      console.log('👤 Options:', options);
      
      // Extract potential token mentions from message
      const tokenMentions = this.extractTokenMentions(message);
      
      // Get comprehensive REAL-TIME market data for strategy analysis
      let marketData = {};
      try {
        if (hederaTokenService) {
          console.log('🌊 Fetching real-time Hedera market data...');
          const topTokens = hederaTokenService.getTopTokens ? hederaTokenService.getTopTokens(50) : [];
          const hederaStats = hederaTokenService.getStats ? hederaTokenService.getStats() : {};
          
          // Get specific real-time data for mentioned tokens
          const strategyTokens = [];
          for (const tokenSymbol of tokenMentions) {
            try {
              const searchResults = hederaTokenService.searchTokens ? hederaTokenService.searchTokens(tokenSymbol) : [];
              if (searchResults.length > 0) {
                const tokenInfo = searchResults[0];
                // Get live market data for more accurate analysis
                const liveData = await hederaTokenService.getLiveTokenData(tokenInfo.id);
                const analysis = hederaTokenService.analyzeToken ? await hederaTokenService.analyzeToken(tokenInfo.id) : null;
                strategyTokens.push({
                  token: tokenInfo,
                  liveData: liveData?.success ? liveData.data : null,
                  analysis: analysis?.success ? analysis.analysis : null
                });
              }
            } catch (tokenError) {
              console.warn(`Failed to fetch strategy data for ${tokenSymbol}:`, tokenError.message);
            }
          }
          
          marketData = {
            topTokens,
            strategyTokens,
            hederaStats,
            marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
            totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
            avgPrice: topTokens.length > 0 ? topTokens.reduce((sum, t) => sum + (parseFloat(t.priceUsd) || 0), 0) / topTokens.length : 0,
            volatilityIndex: this.calculateVolatilityIndex(topTokens),
            marketTrend: this.determineMarketTrend(topTokens),
            liquidityScore: this.calculateLiquidityScore(topTokens),
            timestamp: new Date().toISOString()
          };
          
          console.log('✅ Real-time market data fetched:', {
            tokensCount: topTokens.length,
            marketCap: `$${(marketData.marketCap / 1000000).toFixed(1)}M`,
            volume24h: `$${(marketData.totalVolume / 1000000).toFixed(1)}M`,
            mentionedTokens: tokenMentions.length
          });
        }
      } catch (dataError) {
        console.error('❌ Market data fetch failed for strategy:', dataError.message);
        marketData = { 
          topTokens: [], 
          strategyTokens: [], 
          hederaStats: {}, 
          marketCap: 0, 
          totalVolume: 0,
          avgPrice: 0,
          volatilityIndex: 0,
          marketTrend: 'unknown',
          liquidityScore: 0,
          timestamp: new Date().toISOString() 
        };
      }
      
      // Use AI for comprehensive strategy analysis with actionable tasks
      let strategyAnalysis = {};
      if (together) {
        try {
          console.log('🤖 Using TogetherAI for dynamic strategy analysis...');
          
          const strategyPrompt = this.buildEnhancedStrategyPrompt(message, tokenMentions, marketData);
          
          const aiResponse = await together.chat.completions.create({
            model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            messages: [
              {
                role: 'system',
                content: strategyPrompt.system
              },
              {
                role: 'user',
                content: strategyPrompt.user
              }
            ],
            max_tokens: 6000,
            temperature: 0.3,
            top_p: 0.9,
            response_format: { type: 'json_object' }
          });
          
          console.log('✅ TogetherAI strategy response received');
          
          const responseContent = aiResponse.choices[0].message.content;
          strategyAnalysis = JSON.parse(responseContent);
          
          console.log('🎯 AI strategy analysis completed with action plan');
          
        } catch (aiError) {
          console.error('❌ TogetherAI strategy analysis failed:', aiError.message);
          strategyAnalysis = this.generateBasicStrategyAnalysis(message, tokenMentions, marketData);
        }
      } else {
        console.log('⚠️ TogetherAI not available, using basic strategy analysis');
        strategyAnalysis = this.generateBasicStrategyAnalysis(message, tokenMentions, marketData);
      }
      
      // Ensure proper structure and enhance with actionable tasks
      strategyAnalysis = this.validateAndEnhanceStrategyResponse(strategyAnalysis, marketData, tokenMentions);
      
      // Save strategy to database if userId and agentId are provided
      let savedStrategy = null;
      let executorAgent = null;
      
      if (options.userId && options.agentId) {
        try {
          console.log('💾 Saving strategy to database...');
          savedStrategy = await this.saveStrategyToDatabase(strategyAnalysis, message, marketData, options);
          
          console.log('🤖 Creating integrated executor agent...');
          const actionExecutionService = require('../services/actionExecutionService');
          const agentCreationResult = await actionExecutionService.createExecutorAgent(
            savedStrategy,
            options.userId,
            options.agentId
          );
          
          executorAgent = agentCreationResult.executorAgent;
          const standardAgent = agentCreationResult.standardAgent;
          
          console.log('✅ Strategy, standard agent, and executor agent created successfully:', {
            strategy: savedStrategy._id,
            standardAgent: standardAgent._id,
            executorAgent: executorAgent._id
          });
        } catch (dbError) {
          console.error('❌ Error saving strategy or creating executor agent:', dbError.message);
        }
      }
      
      return {
        type: 'strategy',
        result: {
          strategy: strategyAnalysis.strategy || {},
          analysis: strategyAnalysis.analysis || {},
          recommendations: strategyAnalysis.recommendations || [],
          riskAssessment: strategyAnalysis.riskAssessment || {},
          implementation: strategyAnalysis.implementation || {},
          performance: strategyAnalysis.performance || {},
          timeline: strategyAnalysis.timeline || {},
          actionPlan: strategyAnalysis.actionPlan || {},
          marketContext: {
            timestamp: marketData.timestamp,
            marketCap: marketData.marketCap,
            totalVolume: marketData.totalVolume,
            marketTrend: marketData.marketTrend,
            volatilityIndex: marketData.volatilityIndex
          }
        },
        metadata: {
          savedStrategy: savedStrategy ? {
            id: savedStrategy._id,
            status: savedStrategy.status,
            executionStatus: savedStrategy.executionStatus
          } : null,
          executorAgent: executorAgent ? {
            id: executorAgent._id,
            status: executorAgent.status,
            capabilities: executorAgent.capabilities
          } : null,
          standardAgent: executorAgent ? {
            id: executorAgent.parentAgentId,
            name: `${strategyAnalysis.strategy?.type || 'Strategy'} Agent`,
            linkedToUser: true
          } : null,
          marketDataUsed: {
            tokensAnalyzed: marketData.topTokens?.length || 0,
            realTimeData: true,
            dataSource: 'hederaTokenService'
          }
        },
        status: 'completed',
        processingMethod: together ? 'ai_powered_dynamic_strategy_analysis' : 'basic_strategy_analysis',
        confidence: strategyAnalysis.confidence || 'medium',
        aiEnhanced: !!together
      };
      
    } catch (error) {
      console.error('❌ Strategy processing error:', error);
      
      return {
        type: 'strategy',
        result: {
          error: 'Strategy analysis failed',
          fallback: 'Unable to provide detailed strategy analysis. This could be due to limited data or temporary service issues.',
          basicStrategy: this.generateBasicStrategy(message, this.extractTokenMentions(message)),
          suggestions: [
            'Specify your investment goals (growth, income, stability)',
            'Mention your risk tolerance (low, medium, high)',
            'Include your investment timeline (short, medium, long-term)',
            'List specific tokens you\'re considering (HBAR, SAUCE, USDC)'
          ],
          availableTokens: hederaTokenService ? hederaTokenService.getTopTokens(5).map(t => t.symbol) : ['HBAR', 'SAUCE', 'USDC']
        },
        status: 'error',
        processingMethod: 'error_fallback'
      };
    }
  }

  /**
   * Process information type messages - AI-Powered Dynamic Market Analysis
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @returns {Object} Information processing result
   */
  processInformation = async (message, classification) => {
    try {
      console.log('🧠 Processing information request with AI-powered market analysis...');
      console.log('📝 Original message:', message);
      console.log('🏷️ Classification:', classification.type, '-', classification.actionSubtype);
      
      // Initialize Together AI if not already done
      if (!together && process.env.TOGETHER_API_KEY) {
        try {
          const Together = require('together-ai').default;
          together = new Together({
            apiKey: process.env.TOGETHER_API_KEY
          });
          console.log('🔄 TogetherAI re-initialized for information processing');
        } catch (error) {
          console.error('❌ Together AI re-initialization failed:', error.message);
          throw new Error(`AI service initialization failed: ${error.message}`);
        }
      }

      if (!together) {
        console.error('❌ TogetherAI not available');
        throw new Error('AI service not available. Please set TOGETHER_API_KEY environment variable and install together-ai package.');
      }

      // Extract token queries from message
      const tokenMentions = this.extractTokenMentions(message);
      const requestType = this.classifyInformationRequest(message);
      
      // Fetch comprehensive market data using updated utility (includes GeckoTerminal for HBAR)
      console.log('📊 Fetching comprehensive market data with GeckoTerminal integration...');
      let marketData = {};
      
      try {
        // First, fetch real-time market data from our updated utility
        console.log('🦎 Fetching market data from CoinGecko + GeckoTerminal...');
        const realTimeMarketData = await fetchMarketData(['BTC', 'ETH', 'HBAR', 'USDC', 'USDT', 'DAI', 'LINK', 'MATIC']);
        
        // Get comprehensive market data from Hedera token service for additional tokens
        let topTokens = [];
        let hederaStats = {};
        
        if (hederaTokenService) {
          console.log('🔍 Fetching additional Hedera token data...');
          topTokens = hederaTokenService.getTopTokens ? hederaTokenService.getTopTokens(50) : [];
          hederaStats = hederaTokenService.getStats ? hederaTokenService.getStats() : {};
          
          // Override HBAR data with real-time data from our utility
          if (realTimeMarketData.tokens.HBAR) {
            console.log('✅ Overriding HBAR data with GeckoTerminal data...');
            const hbarFromGecko = realTimeMarketData.tokens.HBAR;
            
            // Find HBAR in topTokens and update it
            const hbarIndex = topTokens.findIndex(t => t.symbol === 'HBAR');
            if (hbarIndex !== -1) {
              topTokens[hbarIndex] = {
                ...topTokens[hbarIndex],
                priceUsd: hbarFromGecko.price,
                marketCap: hbarFromGecko.marketCap,
                volume24h: hbarFromGecko.volume24h,
                change24h: hbarFromGecko.change24h,
                source: 'GeckoTerminal'
              };
              console.log('🎯 HBAR data updated:', {
                price: hbarFromGecko.price,
                marketCap: hbarFromGecko.marketCap,
                volume24h: hbarFromGecko.volume24h,
                change24h: hbarFromGecko.change24h
              });
            }
          }
          
          // Get additional data for mentioned tokens
          const specificTokenData = [];
          for (const tokenSymbol of tokenMentions) {
            try {
              // Check if we have real-time data for this token
              if (realTimeMarketData.tokens[tokenSymbol.toUpperCase()]) {
                const realtimeToken = realTimeMarketData.tokens[tokenSymbol.toUpperCase()];
                specificTokenData.push({
                  token: {
                    symbol: tokenSymbol.toUpperCase(),
                    name: tokenSymbol.toUpperCase(),
                    priceUsd: realtimeToken.price,
                    marketCap: realtimeToken.marketCap,
                    volume24h: realtimeToken.volume24h,
                    change24h: realtimeToken.change24h,
                    source: realtimeToken.source || 'Real-time API'
                  },
                  analysis: null
                });
              } else {
                // Fallback to Hedera token service
                const searchResults = hederaTokenService.searchTokens ? hederaTokenService.searchTokens(tokenSymbol) : [];
                if (searchResults.length > 0) {
                  const tokenInfo = searchResults[0];
                  const analysis = hederaTokenService.analyzeToken ? await hederaTokenService.analyzeToken(tokenInfo.id) : null;
                  specificTokenData.push({
                    token: tokenInfo,
                    analysis: analysis?.success ? analysis.analysis : null
                  });
                }
              }
            } catch (tokenError) {
              console.warn(`Failed to fetch data for token ${tokenSymbol}:`, tokenError.message);
            }
          }
          
          marketData = {
            topTokens: topTokens,
            specificTokens: specificTokenData,
            hederaStats: hederaStats,
            marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
            totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
            averagePrice: topTokens.length > 0 ? topTokens.reduce((sum, t) => sum + (parseFloat(t.priceUsd) || 0), 0) / topTokens.length : 0,
            activeTokens: topTokens.filter(t => t.inTopPools || t.dueDiligenceComplete).length,
            timestamp: new Date().toISOString(),
            requestType: requestType,
            mentionedTokens: tokenMentions.length
          };
          
          console.log(`✅ Fetched data for ${topTokens.length} tokens, ${specificTokenData.length} specific tokens`);
        } else {
          console.warn('⚠️ HederaTokenService not available, using fallback data');
          // Enhanced fallback data with current market conditions
          marketData = {
            topTokens: [
              { symbol: 'HBAR', name: 'Hedera', priceUsd: 0.065, change24h: 3.2, marketCap: 2100000000, volume24h: 45000000, inTopPools: true },
              { symbol: 'SAUCE', name: 'SaucerSwap', priceUsd: 0.012, change24h: -1.8, marketCap: 12000000, volume24h: 2400000, inTopPools: true },
              { symbol: 'WHBAR', name: 'Wrapped HBAR', priceUsd: 0.065, change24h: 3.1, marketCap: 15000000, volume24h: 5200000, inTopPools: true },
              { symbol: 'USDC', name: 'USD Coin', priceUsd: 1.00, change24h: 0.1, marketCap: 850000000, volume24h: 125000000, inTopPools: true },
              { symbol: 'WBTC', name: 'Wrapped Bitcoin', priceUsd: 43250, change24h: 2.4, marketCap: 45000000, volume24h: 8500000, inTopPools: true }
            ],
            specificTokens: [],
            hederaStats: { totalTokens: 500, activeTokens: 120, totalPools: 85 },
            marketCap: 3022000000,
            totalVolume: 186100000,
            averagePrice: 8677.25,
            activeTokens: 5,
            timestamp: new Date().toISOString(),
            requestType: requestType,
            mentionedTokens: tokenMentions.length
          };
        }
      } catch (dataError) {
        console.error('❌ Market data fetch failed:', dataError.message);
        marketData = {
          topTokens: [],
          specificTokens: [],
          hederaStats: {},
          marketCap: 0,
          totalVolume: 0,
          averagePrice: 0,
          activeTokens: 0,
          timestamp: new Date().toISOString(),
          requestType: requestType,
          mentionedTokens: tokenMentions.length,
          error: 'Market data unavailable'
        };
      }

      // Prepare AI prompt for dynamic analysis
      const aiPrompt = this.buildInformationPrompt(message, requestType, tokenMentions, marketData);
      
      // Get AI-powered analysis with enhanced error handling
      console.log('🤖 Querying TogetherAI for comprehensive market insights...');
      console.log('📊 Market data summary:', {
        tokensAvailable: marketData.topTokens?.length || 0,
        mentionedTokens: tokenMentions.length,
        requestType: requestType,
        hasSpecificData: (marketData.specificTokens?.length || 0) > 0
      });
      
      let aiAnalysis;
      try {
        const aiResponse = await together.chat.completions.create({
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          messages: [
            {
              role: 'system',
              content: aiPrompt.system
            },
            {
              role: 'user',
              content: aiPrompt.user
            }
          ],
          max_tokens: 4000,
          temperature: 0.4,
          top_p: 0.9,
          response_format: { type: 'json_object' }
        });

        console.log('✅ TogetherAI response received');
        
        if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
          throw new Error('Invalid AI response format - no choices or message');
        }
        
        const responseContent = aiResponse.choices[0].message.content;
        if (!responseContent) {
          throw new Error('Empty AI response content');
        }
        
        console.log('🔍 Parsing AI response...');
        try {
          aiAnalysis = JSON.parse(responseContent);
        } catch (parseError) {
          console.error('❌ JSON parsing failed:', parseError.message);
          console.log('📝 Raw response:', responseContent);
          
          // Attempt to extract JSON from response if it's wrapped in text
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
          }
        }
        
        // Validate response structure and provide defaults if needed
        aiAnalysis = this.validateAndEnhanceAIResponse(aiAnalysis, marketData, requestType, tokenMentions);
        
      } catch (aiError) {
        console.error('❌ TogetherAI API call failed:', aiError.message);
        
        // Provide intelligent fallback analysis based on available data
        aiAnalysis = this.generateFallbackAnalysis(message, requestType, tokenMentions, marketData, aiError);
      }

      return {
        type: 'information',
        result: {
          requestType,
          analysis: aiAnalysis.analysis,
          recommendations: aiAnalysis.recommendations,
          marketContext: {
            dataSource: 'real-time_crypto_markets',
            lastUpdated: marketData.timestamp,
            tokensAnalyzed: tokenMentions.length || 'general_market',
            aiModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
          },
          actionableInsights: aiAnalysis.actionableInsights || [],
          riskWarnings: aiAnalysis.riskWarnings || [],
          nextSteps: aiAnalysis.nextSteps || []
        },
        status: 'completed',
        processingMethod: 'ai_powered_market_analysis',
        confidence: aiAnalysis.confidence || 'high'
      };
      
    } catch (error) {
      console.error('AI Information processing error:', error);
      
      return {
        type: 'information',
        result: {
          error: 'AI market analysis temporarily unavailable',
          fallback: 'Unable to process your market inquiry at the moment. Please try again in a few moments.',
          suggestion: 'You can ask about specific cryptocurrencies, market trends, price analysis, or general market insights.',
          availableQueries: [
            'What is the current price of Bitcoin?',
            'How is the crypto market performing today?',
            'Which altcoins are trending?',
            'Should I invest in crypto now?'
          ]
        },
        status: 'error',
        processingMethod: 'ai_fallback'
      };
    }
  }

  /**
   * Process feedback type messages - AI-Powered Portfolio Analysis & Recommendations
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @returns {Object} Feedback processing result
   */
  processFeedbacks = async (message, classification) => {
    try {
      console.log('💬 Processing feedback request with AI-powered portfolio analysis...');
      console.log('📝 Original message:', message);
      console.log('🏷️ Classification:', classification.type, '-', classification.actionSubtype);
      
      // Extract portfolio or action references
      const tokenMentions = this.extractTokenMentions(message);
      const feedbackType = this.classifyFeedbackRequest(message);
      
      console.log('🔍 Feedback type:', feedbackType);
      console.log('🪙 Token mentions:', tokenMentions);
      
      // Get comprehensive market data for context
      let marketData = {};
      try {
        if (hederaTokenService) {
          const topTokens = hederaTokenService.getTopTokens ? hederaTokenService.getTopTokens(30) : [];
          const hederaStats = hederaTokenService.getStats ? hederaTokenService.getStats() : {};
          
          // Get specific data for mentioned tokens
          const portfolioData = [];
          for (const tokenSymbol of tokenMentions) {
            try {
              const searchResults = hederaTokenService.searchTokens ? hederaTokenService.searchTokens(tokenSymbol) : [];
              if (searchResults.length > 0) {
                const tokenInfo = searchResults[0];
                const analysis = hederaTokenService.analyzeToken ? await hederaTokenService.analyzeToken(tokenInfo.id) : null;
                portfolioData.push({
                  token: tokenInfo,
                  analysis: analysis?.success ? analysis.analysis : null
                });
              }
            } catch (tokenError) {
              console.warn(`Failed to fetch data for token ${tokenSymbol}:`, tokenError.message);
            }
          }
          
          marketData = {
            topTokens,
            portfolioTokens: portfolioData,
            hederaStats,
            marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
            totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
            timestamp: new Date().toISOString()
          };
        }
      } catch (dataError) {
        console.error('❌ Market data fetch failed for feedback:', dataError.message);
        marketData = { topTokens: [], portfolioTokens: [], hederaStats: {}, marketCap: 0, totalVolume: 0, timestamp: new Date().toISOString() };
      }
      
      // Use AI for comprehensive feedback analysis if available
      let feedbackAnalysis = {};
      if (together) {
        try {
          console.log('🤖 Using TogetherAI for feedback analysis...');
          
          const feedbackPrompt = this.buildFeedbackPrompt(message, feedbackType, tokenMentions, marketData);
          
          const aiResponse = await together.chat.completions.create({
            model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            messages: [
              {
                role: 'system',
                content: feedbackPrompt.system
              },
              {
                role: 'user',
                content: feedbackPrompt.user
              }
            ],
            max_tokens: 4000,
            temperature: 0.3,
            top_p: 0.9,
            response_format: { type: 'json_object' }
          });
          
          console.log('✅ TogetherAI feedback response received');
          
          const responseContent = aiResponse.choices[0].message.content;
          feedbackAnalysis = JSON.parse(responseContent);
          
          console.log('🎯 AI feedback analysis completed');
          
        } catch (aiError) {
          console.error('❌ TogetherAI feedback analysis failed:', aiError.message);
          feedbackAnalysis = this.generateBasicFeedbackAnalysis(message, feedbackType, tokenMentions, marketData);
        }
      } else {
        console.log('⚠️ TogetherAI not available, using basic analysis');
        feedbackAnalysis = this.generateBasicFeedbackAnalysis(message, feedbackType, tokenMentions, marketData);
      }
      
      // Ensure proper structure and enhance with market data
      feedbackAnalysis = this.validateFeedbackResponse(feedbackAnalysis, marketData, feedbackType, tokenMentions);
      
      return {
        type: 'feedbacks',
        result: {
          feedbackType,
          analysis: feedbackAnalysis.analysis || {},
          recommendations: feedbackAnalysis.recommendations || [],
          marketComparison: feedbackAnalysis.marketComparison || await this.getMarketComparisonData(tokenMentions),
          riskAssessment: feedbackAnalysis.riskAssessment || this.assessCurrentRiskProfile(feedbackAnalysis),
          actionItems: feedbackAnalysis.actionItems || [],
          performanceMetrics: feedbackAnalysis.performanceMetrics || {},
          portfolioInsights: feedbackAnalysis.portfolioInsights || {},
          improvementSuggestions: feedbackAnalysis.improvementSuggestions || []
        },
        status: 'completed',
        processingMethod: together ? 'ai_powered_feedback_analysis' : 'basic_feedback_analysis',
        analysisDepth: 'comprehensive',
        aiEnhanced: !!together
      };
      
    } catch (error) {
      console.error('❌ Feedback processing error:', error);
      
      return {
        type: 'feedbacks',
        result: {
          error: 'Comprehensive feedback analysis failed',
          fallback: 'Unable to provide detailed portfolio analysis. This could be due to limited data or temporary service issues.',
          basicInsights: this.generateBasicInsights(message, this.extractTokenMentions(message)),
          suggestions: [
            'Mention specific token symbols in your portfolio (e.g., HBAR, SAUCE, USDC)',
            'Describe your investment timeline and goals',
            'Specify recent trading actions or strategy concerns',
            'Ask about specific aspects like risk management or diversification'
          ],
          nextSteps: [
            'Try asking about specific tokens individually',
            'Provide more context about your portfolio composition',
            'Check back later if technical issues persist'
          ]
        },
        status: 'error',
        processingMethod: 'error_fallback'
      };
    }
  }

  /**
   * Default processing for unknown types
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @returns {Object} Default processing result
   */
  processDefault = async (message, classification) => {
    return {
      type: 'unknown',
      result: {
        message: 'Unable to determine the type of your request',
        suggestion: 'Please try rephrasing your message to be more specific',
        supportedTypes: ['actions', 'strategy', 'information', 'feedbacks'],
        classification: classification
      },
      status: 'unknown',
      processingMethod: 'default_fallback'
    };
  }

  // ===== HELPER METHODS FOR DEEP ANALYSIS =====

  /**
   * Extract token mentions from user message
   * @param {string} message - User message
   * @returns {Array} Array of potential token symbols/names
   */
  extractTokenMentions(message) {
    const tokenPatterns = [
      /\b[A-Z]{2,10}\b/g, // Token symbols (2-10 uppercase letters)
      /\$[A-Z]{2,10}\b/g, // Token symbols with $ prefix
      /0\.0\.[0-9]+/g, // Hedera token IDs
      /\b(?:HBAR|SAUCE|WHBAR)\b/gi // Common Hedera tokens
    ];
    
    const mentions = new Set();
    tokenPatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        matches.forEach(match => mentions.add(match.replace('$', '').toUpperCase()));
      }
    });
    
    return Array.from(mentions);
  }

  /**
   * Generate strategy recommendations based on analysis
   */
  generateStrategyRecommendations(message, tokenAnalysis, topTokens) {
    const recommendations = [];
    
    if (tokenAnalysis.length > 0) {
      tokenAnalysis.forEach(analysis => {
        recommendations.push({
          token: analysis.token.symbol,
          action: analysis.recommendation.action,
          reasoning: analysis.recommendation.reasoning,
          riskLevel: analysis.riskAssessment.level,
          confidence: analysis.recommendation.confidence
        });
      });
    } else {
      // General recommendations based on top tokens
      const lowRiskTokens = topTokens.filter(t => t.dueDiligenceComplete && t.inTopPools);
      recommendations.push({
        type: 'diversification',
        suggestion: 'Consider diversifying across established Hedera tokens',
        tokens: lowRiskTokens.slice(0, 3).map(t => t.symbol),
        reasoning: 'These tokens have completed due diligence and are in top pools'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate risk distribution across tokens
   */
  calculateRiskDistribution(tokens) {
    const distribution = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    
    tokens.forEach(token => {
      const risk = hederaTokenService.assessRisk(token);
      if (risk.level === 'Low') distribution.low++;
      else if (risk.level === 'Medium') distribution.medium++;
      else if (risk.level === 'High') distribution.high++;
      else distribution.veryHigh++;
    });
    
    return distribution;
  }

  /**
   * Generate actionable insights
   */
  generateActionableInsights(tokenAnalysis, topTokens) {
    const insights = [];
    
    if (tokenAnalysis.length > 0) {
      const highRiskTokens = tokenAnalysis.filter(t => t.riskAssessment.level === 'High' || t.riskAssessment.level === 'Very High');
      if (highRiskTokens.length > 0) {
        insights.push({
          type: 'risk_warning',
          message: `${highRiskTokens.length} of your analyzed tokens have high risk profiles`,
          action: 'Consider reducing exposure or implementing stop-losses'
        });
      }
    }
    
    const establishedTokens = topTokens.filter(t => t.dueDiligenceComplete && t.priceUsd > 0.01);
    if (establishedTokens.length > 0) {
      insights.push({
        type: 'opportunity',
        message: 'Consider established tokens with completed due diligence',
        tokens: establishedTokens.slice(0, 3).map(t => t.symbol)
      });
    }
    
    return insights;
  }

  /**
   * Generate risk warnings
   */
  generateRiskWarnings(tokenAnalysis) {
    const warnings = [];
    
    tokenAnalysis.forEach(analysis => {
      if (analysis.riskAssessment.level === 'Very High') {
        warnings.push({
          token: analysis.token.symbol,
          warning: 'VERY HIGH RISK',
          factors: analysis.riskAssessment.factors
        });
      }
    });
    
    return warnings;
  }

  /**
   * Generate next steps
   */
  generateNextSteps(message, tokenAnalysis) {
    const steps = [];
    
    if (tokenAnalysis.length === 0) {
      steps.push('Specify token symbols for detailed analysis');
      steps.push('Review top performing Hedera tokens');
    } else {
      steps.push('Review risk assessments for analyzed tokens');
      steps.push('Consider diversification strategies');
      steps.push('Set up price alerts for monitored tokens');
    }
    
    return steps;
  }

  /**
   * Build dynamic AI prompt for information processing
   * @param {string} message - User's message
   * @param {string} requestType - Type of information request
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Current market data
   * @returns {Object} AI prompt object
   */
  buildInformationPrompt(message, requestType, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasSpecificTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    
    const systemPrompt = `You are a senior Hedera blockchain and cryptocurrency market analyst with deep expertise in the Hedera ecosystem. You specialize in providing comprehensive, data-driven market analysis and investment insights.

EXPERTISE AREAS:
- Hedera Hashgraph ecosystem and tokenomics
- DeFi protocols on Hedera (SaucerSwap, HeliSwap, etc.)
- Hedera native tokens (HBAR, SAUCE, WHBAR, etc.)
- Cross-chain token analysis (USDC, WBTC, ETH on Hedera)
- Market sentiment and technical analysis
- Risk assessment and portfolio optimization

ANALYSIS APPROACH:
1. Data-driven insights based on real market data
2. Hedera-focused perspective with broader crypto context
3. Practical, actionable recommendations
4. Clear risk assessment and warnings
5. User-friendly explanations of complex concepts

RESPONSE FORMAT (STRICT JSON - FOCUS ON NUMBERS & METRICS):
{
  "analysis": {
    "marketOverview": {
      "summary": "Brief 1-2 sentence market summary",
      "totalMarketCap": 0.00,
      "volume24h": 0.00,
      "activeTokens": 0,
      "marketChange24h": 0.00,
      "sentiment": "bullish|bearish|neutral|mixed"
    },
    "keyMetrics": {
      "avgPrice": 0.00,
      "avgChange24h": 0.00,
      "volatilityIndex": 0.00,
      "liquidityScore": 0.00,
      "adoptionRate": 0.00
    },
    "technicalSignals": {
      "trend": "upward|downward|sideways",
      "strength": 0.00,
      "support": 0.00,
      "resistance": 0.00,
      "rsi": 0.00,
      "volume": 0.00
    },
    "fundamentalScore": {
      "ecosystemHealth": 0.00,
      "developmentActivity": 0.00,
      "partnershipStrength": 0.00,
      "adoptionGrowth": 0.00,
      "overallScore": 0.00
    }
  },
  "recommendations": [
    {
      "token": "SYMBOL",
      "action": "BUY|SELL|HOLD|WATCH",
      "confidence": 85,
      "targetPrice": 0.00,
      "currentPrice": 0.00,
      "upside": 15.5,
      "riskScore": 45,
      "timeframe": "1-3 months",
      "reasoning": "Brief 1 sentence explanation"
    }
  ],
  "quickInsights": [
    "Top performer: TOKEN +15.2%",
    "High volume: TOKEN $2.5M",
    "Risk alert: TOKEN volatility 45%"
  ],
  "alerts": [
    "Price target: HBAR $0.08 (+23%)",
    "Stop loss: SAUCE $0.009 (-15%)"
  ],
  "marketData": {
    "timestamp": "2024-01-20T10:30:00Z",
    "dataQuality": 95,
    "confidence": 88,
    "nextUpdate": "1 hour"
  }
}

MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Hedera Tokens Available: ${marketData.topTokens?.length || 0}
- Active Trading Pairs: ${marketData.activeTokens || 0}
- Total Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
- 24h Volume: $${marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}
- Request Type: ${requestType}
- Mentioned Tokens: ${tokenMentions.join(', ') || 'None specified'}

HEDERA ECOSYSTEM STATUS:
- Network: Hedera Mainnet (${marketData.hederaStats?.totalTokens || 500}+ tokens)
- Major DEXs: SaucerSwap, HeliSwap, Pangolin
- Key Infrastructure: Hashgraph consensus, HTS (Hedera Token Service)

ANALYSIS REQUIREMENTS:
- Focus on Hedera ecosystem tokens and dynamics
- Include broader crypto market context when relevant
- Provide specific price levels and percentages
- Consider network effects and protocol developments
- Address liquidity and trading considerations
- Include both bullish and bearish scenarios`;

    // Build comprehensive user prompt with rich market data
    let marketSnapshot = '';
    if (hasMarketData) {
      const topTokensDisplay = marketData.topTokens.slice(0, 8).map(token => {
        const change = token.change24h;
        const changeStr = change > 0 ? `+${change.toFixed(2)}%` : `${change?.toFixed(2) || '0.00'}%`;
        const volumeStr = token.volume24h ? `Vol: $${(token.volume24h / 1000000).toFixed(1)}M` : 'Vol: N/A';
        return `• ${token.symbol}: $${token.priceUsd?.toFixed(6) || 'N/A'} (${changeStr}) - ${volumeStr}`;
      }).join('\n');
      
      marketSnapshot = `
CURRENT HEDERA MARKET DATA:
${topTokensDisplay}

MARKET STATISTICS:
• Total Hedera Market Cap: $${(marketData.marketCap / 1000000).toFixed(1)}M
• 24h Trading Volume: $${(marketData.totalVolume / 1000000).toFixed(1)}M
• Active Tokens: ${marketData.activeTokens}/${marketData.topTokens.length}
• Market Sentiment: ${marketData.totalVolume > 50000000 ? 'High Activity' : 'Moderate Activity'}`;
    }

    let specificTokenAnalysis = '';
    if (marketData.specificTokens && marketData.specificTokens.length > 0) {
      specificTokenAnalysis = `
SPECIFIC TOKEN ANALYSIS:
${marketData.specificTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Liquidity: ${item.token.inTopPools ? 'High' : 'Limited'}
  - Due Diligence: ${item.token.dueDiligenceComplete ? 'Complete' : 'Pending'}
  ${item.analysis ? `- Risk Level: ${item.analysis.riskAssessment?.level || 'Unknown'}` : ''}
`).join('')}`;
    }

    const userPrompt = `Provide comprehensive Hedera market analysis for this query:

USER QUERY: "${message}"

ANALYSIS PARAMETERS:
• Request Type: ${requestType}
• Focus Tokens: ${hasSpecificTokens ? tokenMentions.join(', ') : 'General Hedera ecosystem'}
• Analysis Depth: ${hasSpecificTokens ? 'Token-specific + ecosystem' : 'Ecosystem overview'}
${marketSnapshot}
${specificTokenAnalysis}

ANALYSIS REQUIREMENTS:
1. Market Overview: Current Hedera ecosystem conditions and broader crypto context
2. Token Analysis: Specific insights on mentioned tokens or top Hedera tokens
3. Technical Assessment: Price action, volume, liquidity analysis
4. Fundamental Review: Protocol developments, adoption, ecosystem growth
5. Risk Evaluation: Comprehensive risk factors and warnings
6. Actionable Recommendations: Specific investment/trading suggestions
7. Next Steps: Clear action plan for the user

FOCUS AREAS:
- Hedera network fundamentals and tokenomics
- DeFi ecosystem development (SaucerSwap, HeliSwap growth)
- Cross-chain token adoption on Hedera
- Regulatory environment and compliance advantages
- Enterprise adoption and partnership impacts
- Technical analysis with Hedera-specific considerations

Please provide detailed, data-driven analysis that helps the user understand both immediate market conditions and longer-term Hedera ecosystem trends.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Classify information request type
   */
  classifyInformationRequest(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('value')) {
      return 'price_data';
    } else if (lowerMessage.includes('market') || lowerMessage.includes('overview') || lowerMessage.includes('summary')) {
      return 'market_overview';
    } else if (this.extractTokenMentions(message).length > 0) {
      return 'token_specific';
    }
    
    return 'general';
  }

  /**
   * Get token specific information
   */
  async getTokenSpecificInformation(tokenMentions) {
    const tokenData = [];
    
    for (const mention of tokenMentions) {
      const searchResults = hederaTokenService.searchTokens(mention);
      if (searchResults.length > 0) {
        const token = searchResults[0];
        const liveData = await hederaTokenService.getLiveTokenData(token.id);
        const poolsData = await hederaTokenService.getTokenPools(token.id);
        
        tokenData.push({
          token,
          liveData: liveData.success ? liveData.data : null,
          poolsData: poolsData.success ? poolsData.data : null,
          analysis: await hederaTokenService.analyzeToken(token.id)
        });
      }
    }
    
    return { tokens: tokenData, totalFound: tokenData.length };
  }

  /**
   * Get general token information
   */
  async getGeneralTokenInformation() {
    const topTokens = hederaTokenService.getTopTokens(10);
    const stats = hederaTokenService.getStats();
    
    return {
      topTokens,
      statistics: stats,
      categories: {
        established: topTokens.filter(t => t.dueDiligenceComplete).length,
        highLiquidity: topTokens.filter(t => t.inTopPools).length,
        newTokens: topTokens.filter(t => t.createdAt && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      }
    };
  }

  /**
   * Get market overview information
   */
  async getMarketOverviewInformation() {
    const allTokens = hederaTokenService.getAllTokens();
    const topTokens = hederaTokenService.getTopTokens(20);
    
    return {
      totalTokens: allTokens.length,
      topPerformers: topTokens.slice(0, 10),
      marketSegments: {
        defi: topTokens.filter(t => t.symbol.includes('DEFI') || t.name.toLowerCase().includes('defi')).length,
        gaming: topTokens.filter(t => t.name.toLowerCase().includes('game') || t.name.toLowerCase().includes('nft')).length,
        utility: topTokens.filter(t => t.dueDiligenceComplete && t.inTopPools).length
      },
      riskDistribution: this.calculateRiskDistribution(topTokens)
    };
  }

  /**
   * Get price information
   */
  async getPriceInformation(tokenMentions) {
    const priceData = [];
    
    if (tokenMentions.length > 0) {
      for (const mention of tokenMentions) {
        const searchResults = hederaTokenService.searchTokens(mention);
        if (searchResults.length > 0) {
          const token = searchResults[0];
          const liveData = await hederaTokenService.getLiveTokenData(token.id);
          
          priceData.push({
            symbol: token.symbol,
            name: token.name,
            currentPrice: token.priceUsd,
            livePrice: liveData.success ? liveData.data?.attributes?.price_usd : null,
            change24h: liveData.success ? liveData.data?.attributes?.price_change_percentage?.['24h'] : null
          });
        }
      }
    } else {
      const topTokens = hederaTokenService.getTopTokens(10);
      priceData.push(...topTokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        currentPrice: token.priceUsd
      })));
    }
    
    return { prices: priceData, lastUpdated: new Date().toISOString() };
  }

  /**
   * Get general information
   */
  async getGeneralInformation(message) {
    return {
      message: 'General Hedera ecosystem information',
      ecosystem: {
        totalTokens: hederaTokenService.getAllTokens().length,
        topTokens: hederaTokenService.getTopTokens(5).map(t => ({ symbol: t.symbol, name: t.name })),
        features: ['Fast transactions', 'Low fees', 'Enterprise adoption', 'Sustainable consensus']
      },
      suggestion: 'Ask about specific tokens, market overview, or price data for detailed analysis'
    };
  }

  /**
   * Generate educational content
   */
  generateEducationalContent(requestType, tokenMentions) {
    const content = {
      token_specific: 'Learn about token fundamentals: market cap, liquidity, use cases, and risk factors.',
      market_overview: 'Understand market dynamics: supply/demand, trading volume, and market sentiment.',
      price_data: 'Price analysis includes current value, historical trends, and volatility metrics.',
      general: 'Hedera offers fast, secure, and sustainable blockchain infrastructure for tokens and dApps.'
    };
    
    return content[requestType] || content.general;
  }

  /**
   * Generate related queries
   */
  generateRelatedQueries(message, requestType) {
    const queries = {
      token_specific: ['What is the trading volume?', 'Show me the price history', 'What are the risks?'],
      market_overview: ['Which tokens are trending?', 'Show me new listings', 'What is the market sentiment?'],
      price_data: ['Show me price alerts', 'Compare with other tokens', 'What affects the price?'],
      general: ['Show me top tokens', 'What is Hedera?', 'How to start trading?']
    };
    
    return queries[requestType] || queries.general;
  }

  /**
   * Classify feedback request type
   */
  classifyFeedbackRequest(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('holdings')) {
      return 'portfolio_performance';
    } else if (lowerMessage.includes('action') || lowerMessage.includes('trade') || lowerMessage.includes('transaction')) {
      return 'action_review';
    } else if (lowerMessage.includes('strategy') || lowerMessage.includes('plan')) {
      return 'strategy_evaluation';
    }
    
    return 'general_feedback';
  }

  /**
   * Analyze portfolio performance
   */
  async analyzePortfolioPerformance(tokenMentions, message) {
    const portfolioTokens = [];
    
    for (const mention of tokenMentions) {
      const searchResults = hederaTokenService.searchTokens(mention);
      if (searchResults.length > 0) {
        const analysis = await hederaTokenService.analyzeToken(searchResults[0].id);
        if (analysis.success) {
          portfolioTokens.push(analysis.analysis);
        }
      }
    }
    
    return {
      tokensAnalyzed: portfolioTokens.length,
      overallRisk: this.calculateOverallRisk(portfolioTokens),
      diversification: this.analyzeDiversification(portfolioTokens),
      recommendations: this.generatePortfolioRecommendations(portfolioTokens)
    };
  }

  /**
   * Calculate overall portfolio risk
   */
  calculateOverallRisk(portfolioTokens) {
    if (portfolioTokens.length === 0) return 'Unknown';
    
    const riskScores = portfolioTokens.map(token => token.riskAssessment.score);
    const avgRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    if (avgRisk <= 20) return 'Low';
    else if (avgRisk <= 50) return 'Medium';
    else if (avgRisk <= 75) return 'High';
    else return 'Very High';
  }

  /**
   * Analyze portfolio diversification
   */
  analyzeDiversification(portfolioTokens) {
    const uniqueTokens = portfolioTokens.length;
    const establishedTokens = portfolioTokens.filter(t => t.marketData.dueDiligenceComplete).length;
    
    return {
      tokenCount: uniqueTokens,
      establishedRatio: uniqueTokens > 0 ? (establishedTokens / uniqueTokens) : 0,
      recommendation: uniqueTokens < 3 ? 'Consider adding more tokens for diversification' : 'Good diversification'
    };
  }

  /**
   * Generate portfolio recommendations
   */
  generatePortfolioRecommendations(portfolioTokens) {
    const recommendations = [];
    
    const highRiskTokens = portfolioTokens.filter(t => t.riskAssessment.level === 'High' || t.riskAssessment.level === 'Very High');
    if (highRiskTokens.length > 0) {
      recommendations.push({
        type: 'risk_management',
        message: `Consider reducing exposure to ${highRiskTokens.length} high-risk tokens`,
        priority: 'high'
      });
    }
    
    const lowLiquidityTokens = portfolioTokens.filter(t => !t.marketData.inTopPools);
    if (lowLiquidityTokens.length > 0) {
      recommendations.push({
        type: 'liquidity',
        message: `${lowLiquidityTokens.length} tokens have low liquidity - monitor closely`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Analyze action performance (placeholder)
   */
  async analyzeActionPerformance(message) {
    return {
      message: 'Action performance analysis requires transaction history',
      suggestion: 'Provide specific transaction details or token symbols for analysis'
    };
  }

  /**
   * Evaluate strategy (placeholder)
   */
  async evaluateStrategy(tokenMentions, message) {
    return {
      message: 'Strategy evaluation based on mentioned tokens',
      tokens: tokenMentions,
      suggestion: 'Provide more details about your strategy for comprehensive evaluation'
    };
  }

  /**
   * Provide general feedback
   */
  async provideGeneralFeedback(message, tokenMentions) {
    return {
      message: 'General feedback on Hedera token ecosystem',
      marketHealth: 'Hedera ecosystem shows steady growth with increasing token adoption',
      suggestion: 'Focus on established tokens with completed due diligence for safer investments'
    };
  }

  /**
   * Generate improvement recommendations
   */
  generateImprovementRecommendations(feedbackAnalysis, tokenMentions) {
    return [
      'Diversify across different token categories',
      'Monitor risk levels regularly',
      'Stay updated with Hedera ecosystem developments',
      'Consider dollar-cost averaging for volatile tokens'
    ];
  }

  /**
   * Get market comparison data
   */
  async getMarketComparisonData(tokenMentions) {
    const topTokens = hederaTokenService.getTopTokens(5);
    return {
      benchmarkTokens: topTokens.map(t => ({ symbol: t.symbol, priceUsd: t.priceUsd })),
      marketTrend: 'Stable growth in Hedera ecosystem'
    };
  }

  /**
   * Assess current risk profile
   */
  assessCurrentRiskProfile(feedbackAnalysis) {
    return {
      level: feedbackAnalysis.overallRisk || 'Medium',
      factors: ['Market volatility', 'Token liquidity', 'Due diligence status'],
      recommendation: 'Maintain balanced portfolio with risk management'
    };
  }

  /**
   * Generate action items
   */
  generateActionItems(feedbackAnalysis, recommendations) {
    return [
      'Review portfolio allocation',
      'Set up price alerts',
      'Monitor market trends',
      'Consider rebalancing if needed'
    ];
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(feedbackAnalysis) {
    return {
      riskScore: feedbackAnalysis.overallRisk || 'N/A',
      diversificationScore: feedbackAnalysis.diversification?.recommendation || 'N/A',
      lastAnalyzed: new Date().toISOString()
    };
  }

  /**
   * Validate and enhance AI response structure
   * @param {Object} aiAnalysis - Raw AI response
   * @param {Object} marketData - Market data used
   * @param {string} requestType - Type of request
   * @param {Array} tokenMentions - Mentioned tokens
   * @returns {Object} Enhanced AI analysis
   */
  validateAndEnhanceAIResponse(aiAnalysis, marketData, requestType, tokenMentions) {
    // Ensure required structure exists
    if (!aiAnalysis.analysis) {
      aiAnalysis.analysis = {};
    }
    
    if (!aiAnalysis.recommendations) {
      aiAnalysis.recommendations = [];
    }
    
    // Provide defaults for missing analysis fields
    if (!aiAnalysis.analysis.marketOverview) {
      aiAnalysis.analysis.marketOverview = `Hedera ecosystem analysis based on ${marketData.topTokens?.length || 0} tokens with total market cap of $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}.`;
    }
    
    if (!aiAnalysis.analysis.keyInsights || !Array.isArray(aiAnalysis.analysis.keyInsights)) {
      aiAnalysis.analysis.keyInsights = [
        `Hedera network showing ${marketData.totalVolume > 50000000 ? 'high' : 'moderate'} trading activity`,
        `${marketData.activeTokens || 0} tokens actively trading with established liquidity`,
        `Market focus on ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'general ecosystem development'}`
      ];
    }
    
    if (!aiAnalysis.actionableInsights || !Array.isArray(aiAnalysis.actionableInsights)) {
      aiAnalysis.actionableInsights = [
        'Monitor Hedera ecosystem developments and partnership announcements',
        'Consider dollar-cost averaging for long-term positions',
        'Set up price alerts for key support and resistance levels'
      ];
    }
    
    if (!aiAnalysis.riskWarnings || !Array.isArray(aiAnalysis.riskWarnings)) {
      aiAnalysis.riskWarnings = [
        'Cryptocurrency investments carry high volatility and risk of total loss',
        'Hedera tokens may have limited liquidity compared to major cryptocurrencies',
        'Regulatory changes could impact token availability and trading'
      ];
    }
    
    if (!aiAnalysis.nextSteps || !Array.isArray(aiAnalysis.nextSteps)) {
      aiAnalysis.nextSteps = [
        'Research specific tokens mentioned in analysis',
        'Review your risk tolerance and investment timeline',
        'Consider starting with small position sizes'
      ];
    }
    
    if (!aiAnalysis.confidence) {
      aiAnalysis.confidence = marketData.topTokens?.length > 10 ? 'high' : 'medium';
    }
    
    if (!aiAnalysis.marketSentiment) {
      aiAnalysis.marketSentiment = marketData.totalVolume > 100000000 ? 'bullish' : 'neutral';
    }
    
    if (!aiAnalysis.disclaimer) {
      aiAnalysis.disclaimer = 'This analysis is for informational purposes only and should not be considered financial advice. Always conduct your own research and consult with financial professionals before making investment decisions.';
    }
    
    return aiAnalysis;
  }

  /**
   * Generate intelligent fallback analysis when AI fails
   * @param {string} message - Original user message
   * @param {string} requestType - Type of request
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Available market data
   * @param {Error} aiError - The AI error that occurred
   * @returns {Object} Fallback analysis
   */
  /**
   * Build feedback prompt for AI analysis
   * @param {string} message - User message
   * @param {string} feedbackType - Type of feedback request
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Current market data
   * @returns {Object} Feedback prompt object
   */
  buildFeedbackPrompt(message, feedbackType, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasPortfolioData = tokenMentions.length > 0 && marketData.portfolioTokens && marketData.portfolioTokens.length > 0;
    
    const systemPrompt = `You are a senior portfolio analyst and investment advisor specializing in the Hedera blockchain ecosystem. You provide comprehensive portfolio analysis, performance evaluation, and strategic recommendations for cryptocurrency investments.

EXPERTISE AREAS:
- Portfolio performance analysis and optimization
- Risk assessment and management strategies
- Hedera ecosystem token evaluation
- DeFi protocol analysis and yield strategies
- Market sentiment and technical analysis
- Investment psychology and behavioral finance

FEEDBACK ANALYSIS APPROACH:
1. Comprehensive portfolio evaluation based on mentioned tokens
2. Performance analysis against Hedera ecosystem benchmarks
3. Risk-adjusted return calculations and assessments
4. Diversification analysis and recommendations
5. Market timing and entry/exit strategy evaluation
6. Behavioral bias identification and correction

RESPONSE FORMAT (STRICT JSON - FOCUS ON PORTFOLIO METRICS):
{
  "portfolioSummary": {
    "totalValue": 0.00,
    "performance24h": 0.00,
    "performance7d": 0.00,
    "performance30d": 0.00,
    "riskScore": 65,
    "diversificationScore": 78,
    "liquidityScore": 82,
    "overallGrade": "B+"
  },
  "tokenBreakdown": [
    {
      "token": "HBAR",
      "allocation": 45.2,
      "value": 1250.00,
      "performance24h": 3.5,
      "riskScore": 35,
      "recommendation": "HOLD",
      "targetAllocation": 40.0
    }
  ],
  "riskAnalysis": {
    "volatility": 25.5,
    "maxDrawdown": 18.2,
    "sharpeRatio": 1.45,
    "correlation": 0.75,
    "riskLevel": "MEDIUM",
    "stressTestResult": -22.5
  },
  "performanceMetrics": {
    "totalReturn": 12.8,
    "annualizedReturn": 45.2,
    "winRate": 68.5,
    "profitFactor": 1.85,
    "maxGain": 85.2,
    "maxLoss": -18.7
  },
  "recommendations": [
    {
      "action": "REBALANCE",
      "token": "HBAR",
      "change": -5.2,
      "newTarget": 40.0,
      "impact": "+2.5% returns",
      "priority": 85,
      "reason": "Overweight position"
    }
  ],
  "alerts": [
    "Risk: 65% concentration in HBAR",
    "Opportunity: Add SAUCE (+15% yield)",
    "Action: Rebalance within 7 days"
  ],
  "improvements": [
    {
      "category": "DIVERSIFICATION",
      "suggestion": "Add 2-3 DeFi tokens",
      "impact": "+8% risk-adj returns",
      "effort": "LOW",
      "timeframe": "1-2 weeks"
    }
  ],
  "benchmarkComparison": {
    "hederaIndex": 12.8,
    "yourPortfolio": 15.2,
    "outperformance": 2.4,
    "ranking": "TOP 25%"
  }
}

MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Feedback Type: ${feedbackType}
- Portfolio Tokens: ${tokenMentions.join(', ') || 'Not specified'}
- Market Data Available: ${marketData.topTokens?.length || 0} tokens
- Portfolio Coverage: ${hasPortfolioData ? 'Detailed data available' : 'Limited data'}
- Hedera Ecosystem Status: ${marketData.hederaStats?.totalTokens || 500}+ tokens

ANALYSIS REQUIREMENTS:
- Focus on actionable, specific recommendations
- Include quantitative metrics where possible
- Consider both short-term and long-term perspectives
- Address user's specific concerns and questions
- Provide clear reasoning for all recommendations
- Include risk warnings and disclaimers`;

    let portfolioAnalysis = '';
    if (hasPortfolioData) {
      portfolioAnalysis = `
PORTFOLIO COMPOSITION ANALYSIS:
${marketData.portfolioTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Current Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - 24h Change: ${item.token.change24h ? (item.token.change24h > 0 ? '+' : '') + item.token.change24h.toFixed(2) + '%' : 'N/A'}
  - Liquidity Status: ${item.token.inTopPools ? 'High liquidity' : 'Limited liquidity'}
  - Due Diligence: ${item.token.dueDiligenceComplete ? 'Complete' : 'Pending'}
  ${item.analysis ? `- Risk Assessment: ${item.analysis.riskAssessment?.level || 'Unknown'}
  - Analysis Summary: ${item.analysis.summary || 'No detailed analysis available'}` : ''}
`).join('')}`;
    }

    const userPrompt = `Analyze my portfolio and provide comprehensive feedback:

USER REQUEST: "${message}"

FEEDBACK PARAMETERS:
• Analysis Type: ${feedbackType}
• Portfolio Focus: ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'General portfolio guidance'}
• Market Context: Hedera ecosystem analysis
${portfolioAnalysis}

MARKET CONTEXT:
• Hedera Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
• 24h Trading Volume: $${marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}
• Active Tokens: ${marketData.topTokens?.filter(t => t.inTopPools).length || 0}

ANALYSIS REQUIREMENTS:
1. Portfolio Performance: Evaluate current performance and positioning
2. Risk Assessment: Comprehensive risk analysis with specific metrics
3. Diversification: Portfolio balance and concentration analysis
4. Market Positioning: How portfolio aligns with market opportunities
5. Strategic Recommendations: Specific, actionable improvement suggestions
6. Timeline Planning: Short, medium, and long-term action plans

SPECIFIC FOCUS AREAS:
- Token allocation efficiency and balance
- Risk-adjusted return optimization
- Hedera ecosystem exposure and diversification
- DeFi yield opportunities within portfolio
- Market timing and rebalancing strategies
- Cost optimization and fee management

Please provide detailed, data-driven analysis that helps optimize portfolio performance while managing risk appropriately for the Hedera ecosystem.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Generate basic feedback analysis when AI is not available
   * @param {string} message - User message
   * @param {string} feedbackType - Type of feedback
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Market data
   * @returns {Object} Basic feedback analysis
   */
  generateBasicFeedbackAnalysis(message, feedbackType, tokenMentions, marketData) {
    console.log('🔄 Generating basic feedback analysis...');
    
    const hasTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    
    let portfolioOverview = '';
    const recommendations = [];
    
    if (hasTokens && hasMarketData) {
      // Analyze mentioned tokens
      const portfolioTokens = tokenMentions.map(symbol => {
        const token = marketData.topTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
        return token ? { symbol, data: token, found: true } : { symbol, found: false };
      });
      
      const foundTokens = portfolioTokens.filter(t => t.found);
      portfolioOverview = `Portfolio analysis for ${foundTokens.length} of ${tokenMentions.length} mentioned tokens. `;
      
      if (foundTokens.length > 0) {
        const avgChange = foundTokens.reduce((sum, t) => sum + (t.data.change24h || 0), 0) / foundTokens.length;
        portfolioOverview += `Average 24h performance: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%. `;
        
        // Generate basic recommendations
        foundTokens.forEach(tokenItem => {
          const token = tokenItem.data;
          if (token.change24h > 10) {
            recommendations.push({
              type: 'reduce',
              token: token.symbol,
              reasoning: `${token.symbol} showing strong gains (+${token.change24h.toFixed(2)}%). Consider taking profits.`,
              priority: 'medium',
              timeframe: 'short-term'
            });
          } else if (token.change24h < -10) {
            recommendations.push({
              type: 'watch',
              token: token.symbol,
              reasoning: `${token.symbol} down ${token.change24h.toFixed(2)}%. Monitor for potential buying opportunity.`,
              priority: 'medium',
              timeframe: 'short-term'
            });
          } else {
            recommendations.push({
              type: 'hold',
              token: token.symbol,
              reasoning: `${token.symbol} showing stable performance. Continue monitoring.`,
              priority: 'low',
              timeframe: 'medium-term'
            });
          }
        });
      }
    } else {
      portfolioOverview = 'General portfolio guidance for Hedera ecosystem. ';
      recommendations.push({
        type: 'add',
        token: 'HBAR',
        reasoning: 'Consider HBAR as core Hedera ecosystem exposure.',
        priority: 'medium',
        timeframe: 'long-term'
      });
    }
    
    return {
      analysis: {
        portfolioOverview,
        performanceMetrics: {
          overallPerformance: hasTokens ? 
            'Performance calculated based on available market data' : 
            'Insufficient data for detailed performance analysis',
          riskMetrics: 'Basic risk assessment based on token volatility and market position'
        }
      },
      recommendations,
      riskAssessment: {
        currentRiskLevel: 'medium',
        riskFactors: ['Market volatility', 'Limited liquidity for some tokens', 'Regulatory uncertainty'],
        mitigationStrategies: ['Diversification', 'Position sizing', 'Regular rebalancing']
      }
    };
  }

  /**
   * Validate feedback response structure
   * @param {Object} feedbackAnalysis - AI response
   * @param {Object} marketData - Market data
   * @param {string} feedbackType - Feedback type
   * @param {Array} tokenMentions - Token mentions
   * @returns {Object} Validated response
   */
  validateFeedbackResponse(feedbackAnalysis, marketData, feedbackType, tokenMentions) {
    if (!feedbackAnalysis.analysis) {
      feedbackAnalysis.analysis = {};
    }
    if (!feedbackAnalysis.recommendations) {
      feedbackAnalysis.recommendations = [];
    }
    if (!feedbackAnalysis.actionItems) {
      feedbackAnalysis.actionItems = ['Review portfolio allocation', 'Monitor market trends', 'Consider rebalancing'];
    }
    
    return feedbackAnalysis;
  }

  /**
   * Generate basic insights for error scenarios
   * @param {string} message - User message
   * @param {Array} tokenMentions - Token mentions
   * @returns {Array} Basic insights
   */
  generateBasicInsights(message, tokenMentions) {
    const insights = [
      'Hedera ecosystem offers diverse investment opportunities across DeFi and enterprise tokens',
      'Consider portfolio diversification across different token categories'
    ];
    
    if (tokenMentions.length > 0) {
      insights.push(`You mentioned ${tokenMentions.join(', ')} - research their fundamentals and recent performance`);
    }
    
    return insights;
  }

  /**
   * Build strategy prompt for AI analysis
   * @param {string} message - User message
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Current market data
   * @returns {Object} Strategy prompt object
   */
  buildStrategyPrompt(message, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasTokenData = tokenMentions.length > 0 && marketData.strategyTokens && marketData.strategyTokens.length > 0;
    
    const systemPrompt = `You are a senior investment strategist and portfolio manager specializing in cryptocurrency and DeFi investments within the Hedera ecosystem. You create comprehensive, data-driven investment strategies.

EXPERTISE AREAS:
- Multi-asset portfolio construction and optimization
- Risk-adjusted return maximization strategies
- Hedera ecosystem token evaluation and selection
- DeFi yield farming and staking strategies
- Market timing and tactical asset allocation
- Behavioral finance and investment psychology

STRATEGY APPROACH:
1. Goal-based investment planning
2. Risk-adjusted return optimization
3. Market cycle analysis and positioning
4. Diversification across token categories
5. Yield optimization and income generation
6. Risk management and downside protection

RESPONSE FORMAT (STRICT JSON - STRATEGY METRICS):
{
  "strategy": {
    "name": "Conservative Growth|Balanced|Aggressive Growth|Yield Focused",
    "objective": "Brief strategy goal",
    "riskLevel": 35,
    "expectedReturn": 25.5,
    "timeHorizon": "6-12 months",
    "confidenceScore": 85
  },
  "analysis": {
    "marketPhase": "accumulation|uptrend|distribution|downtrend",
    "opportunityScore": 78,
    "riskReward": 2.8,
    "marketSentiment": "bullish|bearish|neutral",
    "ecosystemHealth": 82
  },
  "allocation": [
    {
      "token": "HBAR",
      "targetWeight": 40.0,
      "currentPrice": 0.065,
      "targetPrice": 0.085,
      "upside": 30.8,
      "allocation": "CORE",
      "reasoning": "Network backbone with enterprise adoption"
    }
  ],
  "riskAssessment": {
    "portfolioRisk": 45,
    "maxDrawdown": 22.5,
    "volatility": 35.2,
    "correlation": 0.65,
    "diversificationScore": 75
  },
  "implementation": {
    "phases": [
      {
        "phase": 1,
        "duration": "2 weeks",
        "actions": ["Buy HBAR 25%", "Add SAUCE 10%"],
        "capital": 35.0
      }
    ],
    "totalTimeline": "8-12 weeks",
    "rebalanceFreq": "monthly"
  },
  "performance": {
    "target6m": 15.2,
    "target12m": 28.5,
    "worstCase": -12.5,
    "bestCase": 45.8,
    "probability": 72
  },
  "alerts": [
    "Entry: HBAR below $0.062",
    "Exit: Portfolio +25% gains",
    "Stop: Portfolio -15% loss"
  ]
}

MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Focus Tokens: ${tokenMentions.join(', ') || 'General Hedera ecosystem'}
- Market Data: ${marketData.topTokens?.length || 0} tokens available
- Strategy Scope: ${hasTokenData ? 'Token-specific strategy' : 'Ecosystem-wide strategy'}
- Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}

STRATEGY REQUIREMENTS:
- Focus on quantifiable metrics and clear targets
- Include specific allocation percentages
- Provide realistic return expectations with probabilities
- Address risk management with concrete limits
- Create actionable implementation timeline
- Consider market conditions and cycles`;

    let tokenAnalysis = '';
    if (hasTokenData) {
      tokenAnalysis = `
STRATEGY TOKEN ANALYSIS:
${marketData.strategyTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Current Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Volume 24h: $${item.token.volume24h ? (item.token.volume24h / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Liquidity: ${item.token.inTopPools ? 'High' : 'Limited'}
  - Risk Level: ${item.analysis?.riskAssessment?.level || 'Unknown'}
  ${item.analysis ? `- Analysis: ${item.analysis.summary || 'Available'}` : ''}
`).join('')}`;
    }

    const userPrompt = `Create a comprehensive investment strategy for this request:

USER REQUEST: "${message}"

STRATEGY PARAMETERS:
• Focus: ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'Hedera ecosystem diversification'}
• Market Context: Current Hedera market conditions
• Data Available: ${marketData.topTokens?.length || 0} tokens analyzed
${tokenAnalysis}

MARKET OVERVIEW:
• Total Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
• 24h Volume: $${marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}
• Active Tokens: ${marketData.topTokens?.filter(t => t.inTopPools).length || 0}

STRATEGY REQUIREMENTS:
1. Investment Objective: Clear strategy goal and approach
2. Asset Allocation: Specific percentage allocations with reasoning
3. Risk Management: Concrete risk limits and diversification rules
4. Implementation Plan: Phased approach with timeline and milestones
5. Performance Targets: Realistic return expectations with probabilities
6. Monitoring Framework: Key metrics and rebalancing criteria

Create a detailed, actionable strategy that balances growth potential with appropriate risk management for the Hedera ecosystem.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Generate basic strategy analysis when AI is not available
   */
  generateBasicStrategyAnalysis(message, tokenMentions, marketData) {
    console.log('🔄 Generating basic strategy analysis...');
    
    const hasTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    
    return {
      strategy: {
        name: 'Balanced Hedera Strategy',
        objective: 'Diversified exposure to Hedera ecosystem',
        riskLevel: 50,
        expectedReturn: 20.0,
        timeHorizon: '6-12 months',
        confidenceScore: 70
      },
      analysis: {
        marketPhase: 'accumulation',
        opportunityScore: 75,
        riskReward: 2.0,
        marketSentiment: 'neutral',
        ecosystemHealth: 80
      },
      allocation: hasTokens && hasMarketData ? 
        tokenMentions.map((symbol, index) => {
          const token = marketData.topTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
          return {
            token: symbol,
            targetWeight: 100 / tokenMentions.length,
            currentPrice: token?.priceUsd || 0,
            allocation: index === 0 ? 'CORE' : 'SATELLITE',
            reasoning: `${symbol} provides ${index === 0 ? 'core' : 'diversified'} exposure`
          };
        }) : 
        [
          { token: 'HBAR', targetWeight: 50, allocation: 'CORE', reasoning: 'Network foundation' },
          { token: 'SAUCE', targetWeight: 25, allocation: 'DEFI', reasoning: 'DEX exposure' },
          { token: 'USDC', targetWeight: 25, allocation: 'STABLE', reasoning: 'Stability buffer' }
        ]
    };
  }

  /**
   * Validate strategy response structure
   */
  validateStrategyResponse(strategyAnalysis, marketData, tokenMentions) {
    if (!strategyAnalysis.strategy) {
      strategyAnalysis.strategy = { name: 'Basic Strategy', riskLevel: 50, expectedReturn: 15 };
    }
    if (!strategyAnalysis.allocation) {
      strategyAnalysis.allocation = [];
    }
    if (!strategyAnalysis.alerts) {
      strategyAnalysis.alerts = ['Monitor market conditions', 'Review allocation monthly'];
    }
    
    return strategyAnalysis;
  }

  /**
   * Generate basic strategy for error scenarios
   */
  generateBasicStrategy(message, tokenMentions) {
    return {
      name: 'Conservative Hedera Strategy',
      allocation: 'HBAR 60%, SAUCE 20%, USDC 20%',
      risk: 'Medium',
      timeline: '3-6 months',
      target: '15-25% returns'
    };
  }

  generateFallbackAnalysis(message, requestType, tokenMentions, marketData, aiError) {
    console.log('🔄 Generating intelligent fallback analysis...');
    
    const hasTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    
    // Generate market overview based on available data
    let marketOverview = '';
    if (hasMarketData) {
      const totalTokens = marketData.topTokens.length;
      const activeTokens = marketData.activeTokens || 0;
      const marketCapM = marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) : 'N/A';
      const volumeM = marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) : 'N/A';
      
      marketOverview = `The Hedera ecosystem currently features ${totalTokens} tracked tokens with ${activeTokens} showing active trading. Total market capitalization stands at $${marketCapM}M with 24-hour trading volume of $${volumeM}M. ${marketData.totalVolume > 50000000 ? 'High trading activity suggests strong market engagement.' : 'Moderate trading activity indicates steady but cautious market participation.'}`;
    } else {
      marketOverview = 'Hedera ecosystem continues to develop with growing token adoption and DeFi protocol deployment. Market conditions reflect broader cryptocurrency trends with focus on sustainable growth and enterprise adoption.';
    }
    
    // Generate token-specific insights
    const tokenInsights = [];
    if (hasTokens && hasMarketData) {
      tokenMentions.forEach(symbol => {
        const token = marketData.topTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
        if (token) {
          const change = token.change24h || 0;
          const trend = change > 5 ? 'strong upward momentum' : change > 0 ? 'positive momentum' : change > -5 ? 'sideways consolidation' : 'downward pressure';
          tokenInsights.push(`${symbol} at $${token.priceUsd?.toFixed(6) || 'N/A'} showing ${trend}`);
        }
      });
    }
    
    // Generate recommendations based on request type and available data
    const recommendations = [];
    if (requestType === 'token_specific' && hasTokens) {
      tokenMentions.forEach(symbol => {
        const token = marketData.topTokens?.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
        recommendations.push({
          type: 'watch',
          token: symbol,
          reasoning: token ? 
            `Monitor ${symbol} for ${token.change24h > 0 ? 'continuation of positive momentum' : 'potential reversal or support levels'}. Current price $${token.priceUsd?.toFixed(6) || 'N/A'}.` :
            `Research ${symbol} fundamentals and trading history before taking positions.`,
          confidence: 'medium',
          timeframe: 'medium-term',
          riskLevel: 'medium'
        });
      });
    } else {
      recommendations.push({
        type: 'watch',
        token: 'HBAR',
        reasoning: 'HBAR as the native Hedera token provides exposure to overall network growth and adoption.',
        confidence: 'medium',
        timeframe: 'long-term',
        riskLevel: 'medium'
      });
    }
    
    return {
      analysis: {
        marketOverview,
        keyInsights: [
          marketOverview.split('.')[0] + '.',
          ...tokenInsights,
          'Hedera\'s energy-efficient consensus mechanism continues to attract enterprise adoption',
          'DeFi ecosystem growth on Hedera provides additional utility for native tokens'
        ].slice(0, 5),
        technicalAnalysis: hasMarketData ? 
          `Market showing ${marketData.totalVolume > 50000000 ? 'elevated' : 'moderate'} trading volumes. Key tokens maintaining liquidity across major trading pairs.` :
          'Technical analysis limited due to data availability. Focus on major tokens with established trading history.',
        fundamentalAnalysis: 'Hedera ecosystem continues maturing with enterprise partnerships, sustainable consensus, and growing DeFi infrastructure supporting long-term value proposition.',
        hederaEcosystemHealth: `Ecosystem health appears ${marketData.activeTokens > 50 ? 'robust' : 'developing'} with ongoing protocol development and increasing token diversity.`
      },
      recommendations,
      actionableInsights: [
        'Start with small position sizes to understand market dynamics',
        'Monitor SaucerSwap and other Hedera DEXs for liquidity trends',
        'Follow Hedera council announcements for ecosystem updates',
        'Consider dollar-cost averaging for long-term positions'
      ],
      riskWarnings: [
        'AI analysis temporarily unavailable - relying on basic market data analysis',
        'Hedera tokens may have limited liquidity compared to major cryptocurrencies',
        'Market volatility can result in significant price swings',
        'Always verify token contracts and use reputable exchanges'
      ],
      nextSteps: [
        'Verify token information through official Hedera sources',
        'Research specific protocols and their tokenomics',
        'Set up price alerts for tokens of interest',
        'Consider your risk tolerance and investment timeline'
      ],
      marketSentiment: marketData.totalVolume > 100000000 ? 'bullish' : 'neutral',
      confidence: 'medium',
      disclaimer: 'This fallback analysis is generated from available market data only. AI-powered analysis temporarily unavailable. Always conduct thorough research before making investment decisions.',
      fallbackReason: `AI analysis failed: ${aiError.message}. Using market data-based analysis instead.`
    };
  }

  /**
   * Calculate volatility index based on token price changes
   */
  calculateVolatilityIndex(tokens) {
    if (!tokens || tokens.length === 0) return 0;
    
    const changes = tokens
      .filter(t => t.change24h !== undefined)
      .map(t => Math.abs(t.change24h));
    
    if (changes.length === 0) return 0;
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return Math.round(avgChange * 10) / 10; // Round to 1 decimal
  }

  /**
   * Determine overall market trend
   */
  determineMarketTrend(tokens) {
    if (!tokens || tokens.length === 0) return 'neutral';
    
    const changes = tokens
      .filter(t => t.change24h !== undefined)
      .map(t => t.change24h);
    
    if (changes.length === 0) return 'neutral';
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const positiveTrends = changes.filter(c => c > 0).length;
    const negativeTrends = changes.filter(c => c < 0).length;
    
    if (avgChange > 2 && positiveTrends > negativeTrends) return 'bullish';
    if (avgChange < -2 && negativeTrends > positiveTrends) return 'bearish';
    if (Math.abs(avgChange) > 5) return 'volatile';
    return 'neutral'; // Changed from 'sideways' to 'neutral'
  }

  /**
   * Calculate liquidity score based on volume and market participation
   */
  calculateLiquidityScore(tokens) {
    if (!tokens || tokens.length === 0) return 0;
    
    const liquidTokens = tokens.filter(t => t.inTopPools && t.volume24h > 0).length;
    const totalTokens = tokens.length;
    
    return Math.round((liquidTokens / totalTokens) * 100);
  }

  /**
   * Build enhanced strategy prompt with real-time market data
   */
  buildEnhancedStrategyPrompt(message, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasTokenData = tokenMentions.length > 0 && marketData.strategyTokens && marketData.strategyTokens.length > 0;
    
    const systemPrompt = `You are a senior DeFi investment strategist and portfolio manager specializing in the Hedera ecosystem with real-time market analysis capabilities. You create comprehensive, executable investment strategies with detailed action plans.

REAL-TIME MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Market Trend: ${marketData.marketTrend}
- Volatility Index: ${marketData.volatilityIndex}%
- Liquidity Score: ${marketData.liquidityScore}%
- Total Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
- 24h Volume: $${marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}

RESPONSE FORMAT (STRICT JSON WITH EXECUTABLE ACTION PLAN):
{
  "strategy": {
    "name": "Strategy Name",
    "type": "Conservative Growth|Balanced|Aggressive Growth|Yield Focused|Custom",
    "objective": "Clear strategy goal",
    "riskLevel": 35,
    "expectedReturn": 25.5,
    "timeHorizon": "3-6 months",
    "confidenceScore": 85
  },
  "analysis": {
    "marketCondition": "Current market assessment",
    "opportunityScore": 78,
    "riskReward": 2.8,
    "marketSentiment": "bullish|bearish|neutral",
    "keyInsights": ["Insight 1", "Insight 2", "Insight 3"]
  },
  "actionPlan": {
    "phases": [
      {
        "phaseNumber": 1,
        "phaseName": "Initial Allocation",
        "duration": "2 weeks",
        "tasks": [
          {
            "taskType": "BUY",
            "tokenSymbol": "HBAR",
            "allocation": "40%",
            "targetPrice": 0.065,
            "priority": "high",
            "triggerConditions": {
              "priceBelow": 0.067,
              "volumeThreshold": 1000000,
              "marketCondition": "stable"
            },
            "executionInstructions": "Execute during market hours with limit order"
          }
        ]
      }
    ],
    "totalEstimatedDuration": "8-12 weeks",
    "riskManagement": {
      "stopLossGlobal": 15,
      "takeProfitGlobal": 30,
      "maxDrawdown": 20,
      "riskScore": 45
    }
  },
  "recommendations": [
    {
      "token": "HBAR",
      "action": "BUY",
      "confidence": 85,
      "targetPrice": 0.085,
      "currentPrice": 0.065,
      "upside": 30.8,
      "reasoning": "Strong fundamentals and network growth"
    }
  ],
  "implementation": {
    "immediateActions": ["Action 1", "Action 2"],
    "weeklyTasks": ["Task 1", "Task 2"],
    "monitoringPoints": ["Monitor 1", "Monitor 2"]
  },
  "performance": {
    "target30d": 8.5,
    "target90d": 20.2,
    "worstCase": -12.5,
    "bestCase": 45.8,
    "probability": 72
  }
}

STRATEGY REQUIREMENTS:
- Create executable action plans with specific tasks
- Include trigger conditions for automated execution
- Provide realistic timelines and risk management
- Focus on Hedera ecosystem opportunities
- Include both manual and automated execution options`;

    let tokenAnalysis = '';
    if (hasTokenData) {
      tokenAnalysis = `
REAL-TIME TOKEN ANALYSIS:
${marketData.strategyTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Current Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Live Price: $${item.liveData?.attributes?.price_usd?.toFixed(6) || 'Same'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - 24h Change: ${item.token.change24h ? (item.token.change24h > 0 ? '+' : '') + item.token.change24h.toFixed(2) + '%' : 'N/A'}
  - Volume: $${item.token.volume24h ? (item.token.volume24h / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Liquidity: ${item.token.inTopPools ? 'High' : 'Limited'}
  - Risk Level: ${item.analysis?.riskAssessment?.level || 'Unknown'}
`).join('')}`;
    }

    const userPrompt = `Create a comprehensive, executable investment strategy:

USER REQUEST: "${message}"

STRATEGY PARAMETERS:
• Focus Tokens: ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'Hedera ecosystem diversification'}
• Real-time Market Data: ${marketData.topTokens?.length || 0} tokens analyzed
• Market Condition: ${marketData.marketTrend} trend with ${marketData.volatilityIndex}% volatility
${tokenAnalysis}

CURRENT MARKET SNAPSHOT:
• Top Hedera Tokens by Volume:
${marketData.topTokens?.slice(0, 5).map(token => 
  `  - ${token.symbol}: $${token.priceUsd?.toFixed(6) || 'N/A'} (${token.change24h > 0 ? '+' : ''}${token.change24h?.toFixed(2) || '0.00'}%)`
).join('\n') || '  - No data available'}

• Market Metrics:
  - Volatility Index: ${marketData.volatilityIndex}%
  - Liquidity Score: ${marketData.liquidityScore}%
  - Active Trading Pairs: ${marketData.topTokens?.filter(t => t.inTopPools).length || 0}

STRATEGY REQUIREMENTS:
1. Executable Action Plan: Create phases with specific, actionable tasks
2. Real-time Triggers: Use current market data for trigger conditions
3. Risk Management: Include stop-loss and take-profit levels
4. Timeline: Provide realistic execution timeline
5. Automation Ready: Prepare tasks for automated execution by AI agent

Create a strategy that can be immediately saved to database and executed by an AI agent.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Validate and enhance strategy response with proper action plan structure
   */
  validateAndEnhanceStrategyResponse(strategyAnalysis, marketData, tokenMentions) {
    // Ensure basic structure exists
    if (!strategyAnalysis.strategy) {
      strategyAnalysis.strategy = {
        name: 'Hedera Ecosystem Strategy',
        type: 'Balanced',
        riskLevel: 50,
        expectedReturn: 20,
        timeHorizon: '3-6 months'
      };
    }

    if (!strategyAnalysis.actionPlan) {
      strategyAnalysis.actionPlan = this.generateBasicActionPlan(tokenMentions, marketData);
    }

    if (!strategyAnalysis.recommendations) {
      strategyAnalysis.recommendations = [];
    }

    // Enhance action plan with unique task IDs and proper structure
    if (strategyAnalysis.actionPlan && strategyAnalysis.actionPlan.phases) {
      strategyAnalysis.actionPlan.phases.forEach((phase, phaseIndex) => {
        phase.phaseNumber = phaseIndex + 1;
        if (phase.tasks) {
          phase.tasks.forEach((task, taskIndex) => {
            if (!task.taskId) {
              task.taskId = `task_${Date.now()}_${phaseIndex}_${taskIndex}`;
            }
            if (!task.priority) {
              task.priority = 'medium';
            }
            
            // Sanitize targetPrice to ensure it's a number
            if (task.targetPrice) {
              task.targetPrice = this.sanitizeTargetPrice(task.targetPrice, task.tokenSymbol, marketData);
            }
            
            if (!task.triggerConditions) {
              task.triggerConditions = this.generateTriggerConditions(task, marketData);
            }
          });
        }
      });
    }

    return strategyAnalysis;
  }

  /**
   * Generate basic action plan when AI doesn't provide one
   */
  generateBasicActionPlan(tokenMentions, marketData) {
    const hasTokens = tokenMentions.length > 0;
    const tokens = hasTokens ? tokenMentions : ['HBAR', 'SAUCE', 'USDC'];
    
    return {
      phases: [
        {
          phaseNumber: 1,
          phaseName: 'Initial Setup',
          duration: '1 week',
          tasks: tokens.map((token, index) => ({
            taskId: `task_${Date.now()}_${index}`,
            taskType: 'BUY',
            tokenSymbol: token,
            allocation: `${Math.round(100/tokens.length)}%`,
            priority: index === 0 ? 'high' : 'medium',
            triggerConditions: this.generateTriggerConditions({ tokenSymbol: token }, marketData),
            executionInstructions: `Acquire ${token} allocation during favorable market conditions`
          }))
        },
        {
          phaseNumber: 2,
          phaseName: 'Monitoring & Optimization',
          duration: '4-8 weeks',
          tasks: [
            {
              taskId: `task_${Date.now()}_monitor`,
              taskType: 'MONITOR',
              tokenSymbol: 'ALL',
              allocation: '100%',
              priority: 'medium',
              triggerConditions: {
                timeCondition: 'daily',
                marketCondition: 'any'
              },
              executionInstructions: 'Monitor portfolio performance and market conditions'
            }
          ]
        }
      ],
      totalEstimatedDuration: '6-10 weeks',
      riskManagement: {
        stopLossGlobal: 15,
        takeProfitGlobal: 25,
        maxDrawdown: 20,
        riskScore: 50
      }
    };
  }

  /**
   * Generate trigger conditions for tasks
   */
  generateTriggerConditions(task, marketData) {
    const tokenData = marketData.topTokens?.find(t => t.symbol === task.tokenSymbol);
    
    if (tokenData) {
      return {
        priceBelow: tokenData.priceUsd * 1.05, // 5% above current price
        volumeThreshold: tokenData.volume24h * 0.5, // Half of current volume
        marketCondition: 'stable'
      };
    }

    return {
      marketCondition: 'stable',
      timeCondition: 'market_hours'
    };
  }

  /**
   * Save strategy to database
   */
  async saveStrategyToDatabase(strategyAnalysis, originalMessage, marketData, options) {
    const Strategy = require('../models/Strategy');
    const { v4: uuidv4 } = require('uuid');

    const strategy = new Strategy({
      userId: options.userId,
      agentId: options.agentId,
      agentName: `Strategy Agent ${Date.now()}`,
      agentUuid: uuidv4(),
      description: strategyAnalysis.strategy?.objective || 'AI-generated Hedera strategy',
      primaryStrategy: this.mapStrategyType(strategyAnalysis.strategy?.type),
      riskTolerance: this.mapRiskLevel(strategyAnalysis.strategy?.riskLevel),
      defaultBudget: 1000, // Default budget
      frequency: 'daily',
      portfolioAllocation: this.extractPortfolioAllocation(strategyAnalysis),
      maxPositionSize: 20, // 20% max per position
      stopLossPercentage: strategyAnalysis.actionPlan?.riskManagement?.stopLossGlobal || 15,
      takeProfitPercentage: strategyAnalysis.actionPlan?.riskManagement?.takeProfitGlobal || 25,
      customPrompt: originalMessage,
      extractedIntent: strategyAnalysis.strategy?.objective,
      portfolioManagementPlan: strategyAnalysis.implementation || {},
      marketInsights: JSON.stringify(strategyAnalysis.analysis),
      riskAssessment: JSON.stringify(strategyAnalysis.actionPlan?.riskManagement),
      strategyAdvantages: strategyAnalysis.recommendations?.map(r => r.reasoning).join('; '),
      potentialDrawbacks: `Max drawdown: ${strategyAnalysis.actionPlan?.riskManagement?.maxDrawdown || 20}%`,
      successMetrics: JSON.stringify(strategyAnalysis.performance),
      
      // Enhanced fields
      marketDataSnapshot: {
        timestamp: new Date(),
        hederaMarketCap: marketData.marketCap,
        totalVolume24h: marketData.totalVolume,
        tokensPrices: this.extractTokenPrices(marketData),
        topTokens: marketData.topTokens?.slice(0, 10).map(t => ({
          symbol: t.symbol,
          price: t.priceUsd,
          change24h: t.change24h,
          volume: t.volume24h
        })) || [],
        marketSentiment: marketData.marketTrend
      },
      
      actionPlan: strategyAnalysis.actionPlan,
      executionStatus: 'not_started',
      executionMetrics: {
        tasksCompleted: 0,
        tasksTotal: this.countTotalTasks(strategyAnalysis.actionPlan),
        currentReturn: 0,
        totalInvested: 0
      },
      
      originalUserMessage: originalMessage,
      status: 'generated'
    });

    return await strategy.save();
  }

  /**
   * Helper method to map strategy types
   */
  mapStrategyType(aiStrategyType) {
    const mapping = {
      'Conservative Growth': 'DCA',
      'Balanced': 'swing_trading',
      'Aggressive Growth': 'momentum_trading',
      'Yield Focused': 'yield_farming',
      'Custom': 'custom'
    };
    return mapping[aiStrategyType] || 'custom';
  }

  /**
   * Helper method to map risk levels
   */
  mapRiskLevel(riskScore) {
    if (riskScore <= 30) return 'conservative';
    if (riskScore <= 70) return 'moderate';
    return 'aggressive';
  }

  /**
   * Extract portfolio allocation from strategy analysis
   */
  extractPortfolioAllocation(strategyAnalysis) {
    const allocation = {};
    
    if (strategyAnalysis.recommendations) {
      strategyAnalysis.recommendations.forEach(rec => {
        if (rec.token && rec.allocation) {
          allocation[rec.token] = rec.allocation;
        }
      });
    }

    // Default allocation if none provided
    if (Object.keys(allocation).length === 0) {
      allocation['HBAR'] = '40%';
      allocation['SAUCE'] = '30%';
      allocation['USDC'] = '30%';
    }

    return allocation;
  }

  // ===== END HELPER METHODS =====

  /**
   * Enhanced message processing with intent validation and interactive components
   */
  processMessageWithValidation = async (req, res) => {
    try {
      console.log('📨 Enhanced message processing started');
      
      const { message, userId, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a string',
          timestamp: new Date().toISOString()
        });
      }

      // Parse message with enhanced intent service
      const intentResult = await enhancedIntentService.parseMessageWithValidation(message, userId);

      // Check if action is complete or needs more information
      if (intentResult.validation.isValid && intentResult.classification.type === 'actions') {
        // Process the complete action
        console.log('✅ Action is complete, processing...');
        
        try {
          const actionResult = await actionsProcessingService.executeAction(
            intentResult.extraction.actionType,
            intentResult.validation.resolved,
            userId
          );

          return res.json({
            success: true,
            type: 'actionComplete',
            data: {
              intent: intentResult,
              actionResult: this.sanitizeBigInt(actionResult)
            },
            timestamp: new Date().toISOString()
          });

        } catch (actionError) {
          console.error('❌ Action execution failed:', actionError);
          return res.json({
            success: false,
            type: 'actionError',
            data: {
              intent: intentResult,
              error: actionError.message
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // If missing arguments, return interactive components
      if (intentResult.interactiveData) {
        console.log('🔄 Missing arguments, returning interactive components');
        
        return res.json({
          success: true,
          type: 'argumentRequest',
          data: {
            intent: intentResult,
            interactive: intentResult.interactiveData,
            contactsAndTokens: enhancedIntentService.getContactsAndTokensData()
          },
          timestamp: new Date().toISOString()
        });
      }

      // For non-action messages, route to appropriate handler
      if (intentResult.classification.type === 'strategy') {
        // Handle strategy creation
        const strategyResult = await this.handleStrategyMessage(message, userId);
        return res.json({
          success: true,
          type: 'strategy',
          data: {
            intent: intentResult,
            strategy: this.sanitizeBigInt(strategyResult)
          },
          timestamp: new Date().toISOString()
        });
      }

      if (intentResult.classification.type === 'information') {
        // Handle information request
        const infoResult = await this.handleInformationMessage(message, userId);
        return res.json({
          success: true,
          type: 'information',
          data: {
            intent: intentResult,
            information: infoResult
          },
          timestamp: new Date().toISOString()
        });
      }

      // Default response for unhandled cases
      return res.json({
        success: true,
        type: 'general',
        data: {
          intent: intentResult,
          message: 'I understand your message but need more context to help you properly.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Enhanced message processing failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        type: 'processingError',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Process interactive response from user
   */
  processInteractiveResponse = async (req, res) => {
    try {
      console.log('🔄 Processing interactive response');
      
      const { originalIntent, userResponses, userId } = req.body;

      if (!originalIntent || !userResponses) {
        return res.status(400).json({
          success: false,
          error: 'Original intent and user responses are required',
          timestamp: new Date().toISOString()
        });
      }

      // Process the user's responses
      console.log('📋 Processing interactive response with:', {
        originalIntent: JSON.stringify(originalIntent, null, 2),
        userResponses: JSON.stringify(userResponses, null, 2)
      });
      
      const updatedIntent = await enhancedIntentService.processInteractiveResponse(
        originalIntent,
        userResponses
      );
      
      console.log('✅ Updated intent result:', JSON.stringify(updatedIntent, null, 2));

      // Check if we now have all required arguments
      if (updatedIntent.isComplete && updatedIntent.classification.type === 'actions') {
        console.log('✅ All arguments provided, executing action...');
        
        try {
          const actionResult = await actionsProcessingService.executeAction(
            updatedIntent.extraction.actionType,
            updatedIntent.validation.resolved,
            userId
          );

          return res.json({
            success: true,
            type: 'actionComplete',
            data: {
              intent: updatedIntent,
              actionResult: this.sanitizeBigInt(actionResult)
            },
            timestamp: new Date().toISOString()
          });

        } catch (actionError) {
          console.error('❌ Action execution failed:', actionError);
          return res.json({
            success: false,
            type: 'actionError',
            data: {
              intent: updatedIntent,
              error: actionError.message
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // If still missing arguments, return new interactive components
      if (updatedIntent.interactiveData) {
        return res.json({
          success: true,
          type: 'argumentRequest',
          data: {
            intent: updatedIntent,
            interactive: updatedIntent.interactiveData,
            contactsAndTokens: enhancedIntentService.getContactsAndTokensData()
          },
          timestamp: new Date().toISOString()
        });
      }

      // This shouldn't happen, but handle gracefully
      return res.json({
        success: false,
        type: 'unexpectedState',
        data: {
          intent: updatedIntent,
          message: 'Unexpected state in interactive processing'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Interactive response processing failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        type: 'processingError',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get contacts and tokens data for frontend
   */
  getContactsAndTokens = async (req, res) => {
    try {
      const data = enhancedIntentService.getContactsAndTokensData();
      
      return res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Failed to get contacts and tokens:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get router statistics and supported features
   */
  getRouterInfo = async (req, res) => {
    try {
      const classificationStats = messageClassificationService.getStats();
      const actionsStats = actionsProcessingService.getStats();

      const routerInfo = {
        success: true,
        data: {
          routerVersion: '1.0.0',
          description: 'Two-layer prompt routing system for crypto operations',
          
          // Layer 1 info
          layer1: {
            name: 'Message Classification',
            service: classificationStats,
            supportedTypes: ['strategy', 'actions', 'information', 'feedbacks']
          },
          
          // Layer 2 info
          layer2: {
            name: 'Specialized Processing',
            services: {
              actions: {
                status: 'implemented',
                service: actionsStats
              },
              strategy: {
                status: 'placeholder',
                description: 'Investment and trading strategy generation'
              },
              information: {
                status: 'placeholder',
                description: 'Market data and educational content'
              },
              feedbacks: {
                status: 'placeholder',
                description: 'Action analysis and recommendations'
              }
            }
          },
          
          // Usage stats
          usage: {
            totalRequests: 0, // TODO: Implement request counting
            successRate: '95%', // TODO: Implement success tracking
            averageResponseTime: '2.5s' // TODO: Implement timing tracking
          },
          
          timestamp: new Date().toISOString()
        }
      };

      res.json(routerInfo);

    } catch (error) {
      console.error('Router info error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get router information',
        error: error.message
      });
    }
  }

  /**
   * Get supported actions for the actions processor
   */
  getSupportedActions = async (req, res) => {
    try {
      const supportedActions = actionsProcessingService.getSupportedActions();
      
      res.json({
        success: true,
        data: {
          supportedActions: supportedActions,
          count: supportedActions.length,
          descriptions: {
            transfer: 'Send tokens to another address',
            swap: 'Exchange one token for another',
            stake: 'Stake tokens for rewards',
            lend: 'Lend tokens for passive income',
            borrow: 'Borrow tokens against collateral',
            bridge: 'Transfer tokens between networks',
            buy: 'Purchase tokens',
            sell: 'Sell tokens',
            mint: 'Create new tokens',
            burn: 'Destroy tokens',
            other: 'Other blockchain actions'
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Supported actions error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get supported actions',
        error: error.message
      });
    }
  }

  /**
   * Count total tasks in action plan
   * @param {Object} actionPlan - Action plan object
   * @returns {Number} Total number of tasks
   */
  countTotalTasks(actionPlan) {
    if (!actionPlan || !actionPlan.phases) return 0;
    
    return actionPlan.phases.reduce((total, phase) => {
      return total + (phase.tasks ? phase.tasks.length : 0);
    }, 0);
  }

  /**
   * Extract token prices from market data
   * @param {Object} marketData - Market data object
   * @returns {Object} Object with token prices
   */
  extractTokenPrices(marketData) {
    const prices = {};
    if (marketData.topTokens) {
      marketData.topTokens.forEach(token => {
        if (token.symbol && token.priceUsd) {
          prices[token.symbol] = token.priceUsd;
        }
      });
    }
    return prices;
  }

  /**
   * Sanitize target price to ensure it's a valid number
   * @param {any} targetPrice - The target price value from AI
   * @param {string} tokenSymbol - Token symbol for context
   * @param {Object} marketData - Market data for current price reference
   * @returns {Number} Sanitized numeric target price
   */
  sanitizeTargetPrice(targetPrice, tokenSymbol, marketData) {
    // If it's already a valid number, return it
    if (typeof targetPrice === 'number' && !isNaN(targetPrice) && targetPrice > 0) {
      return targetPrice;
    }

    // If it's a string that can be parsed as a number
    if (typeof targetPrice === 'string') {
      // Try to extract number from string
      const numericMatch = targetPrice.match(/[\d.]+/);
      if (numericMatch) {
        const parsed = parseFloat(numericMatch[0]);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }

      // Handle percentage-based targets
      if (targetPrice.includes('%') || targetPrice.toLowerCase().includes('increase') || targetPrice.toLowerCase().includes('decrease')) {
        const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
        if (currentPrice > 0) {
          // Default to 10% increase if we can't parse the percentage
          return currentPrice * 1.1;
        }
      }

      // Handle descriptive targets like "double", "triple", etc.
      if (targetPrice.toLowerCase().includes('double')) {
        const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
        return currentPrice > 0 ? currentPrice * 2 : 1;
      }
      
      if (targetPrice.toLowerCase().includes('triple')) {
        const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
        return currentPrice > 0 ? currentPrice * 3 : 1;
      }
    }

    // Fallback: use current market price * 1.1 (10% above current price)
    const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
    return currentPrice > 0 ? currentPrice * 1.1 : 1;
  }

  /**
   * Get current token price from market data
   * @param {string} tokenSymbol - Token symbol
   * @param {Object} marketData - Market data object
   * @returns {Number} Current token price or 0 if not found
   */
  getCurrentTokenPrice(tokenSymbol, marketData) {
    if (!tokenSymbol || !marketData.topTokens) return 0;
    
    const token = marketData.topTokens.find(t => 
      t.symbol && t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
    );
    
    return token && token.priceUsd ? parseFloat(token.priceUsd) : 0;
  }

  /**
   * Handle information requests
   * @param {string} message - User message
   * @param {string} userId - User ID
   * @returns {Object} Information response
   */
  async handleInformationMessage(message, userId) {
    try {
      // Use the existing information processing
      const result = await this.processInformation(message, {
        type: 'information',
        confidence: 0.8,
        reasoning: 'Information request processed'
      });
      
      return result;
    } catch (error) {
      console.error('Information handling error:', error);
      return {
        type: 'information',
        result: {
          answer: 'I apologize, but I encountered an error while processing your information request. Please try again.',
          category: 'error'
        },
        status: 'error'
      };
    }
  }

  /**
   * Handle strategy requests  
   * @param {string} message - User message
   * @param {string} userId - User ID
   * @returns {Object} Strategy response
   */
  async handleStrategyMessage(message, userId) {
    try {
      // Use the existing strategy processing
      const result = await this.processStrategy(message, {
        type: 'strategy',
        confidence: 0.8,
        reasoning: 'Strategy request processed'
      }, { userId });
      
      return result;
    } catch (error) {
      console.error('Strategy handling error:', error);
      return {
        type: 'strategy',
        result: {
          response: 'I apologize, but I encountered an error while processing your strategy request. Please try again.',
          strategyType: 'error'
        },
        status: 'error'
      };
    }
  }
}

// Export controller instance
const promptRouterController = new PromptRouterController();
module.exports = promptRouterController;