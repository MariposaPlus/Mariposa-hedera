const { validationResult } = require('express-validator');
const Together = require('together-ai').default;
const Memory = require('../models/Memory');
const Agent = require('../models/Agent');
const { fetchMarketData, formatMarketDataForAI } = require('../utils/marketData');

// Initialize Together AI
let together;
try {
  together = new Together({
    apiKey: process.env.TOGETHER_API_KEY || 'dummy-key'
  });
} catch (error) {
  console.warn('Together AI not initialized. Please set TOGETHER_API_KEY environment variable.');
  together = null;
}

// Helper function to generate or get session ID
const getSessionId = (req) => {
  // For now, we'll use a combination of IP and User-Agent for session identification
  // In production, you'd want to use proper session management
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `${ip}_${userAgent}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
};

// Helper function to extract budget amount from strategy
const extractBudgetAmount = (strategy) => {
  if (!strategy.budgetRecommendation) return 0;
  
  // Try to extract dollar amount from recommendedBudget string
  const budgetMatch = strategy.budgetRecommendation.recommendedBudget?.match(/\$(\d+)/);
  if (budgetMatch) {
    return parseInt(budgetMatch[1]);
  }
  
  // Fallback: sum up action amounts
  return strategy.actionPlan?.reduce((total, action) => {
    const amountMatch = action.dollarAmount?.match(/\$?([\d.]+)/);
    return total + (amountMatch ? parseFloat(amountMatch[1]) : 0);
  }, 0) || 0;
};

// Helper function to map agent strategy to valid enum values
const mapStrategyToEnum = (primaryStrategy) => {
  const strategyMap = {
    'DCA': 'long_holding',
    'dca': 'long_holding',
    'hodl': 'long_holding',
    'long_holding': 'long_holding',
    'momentum_trading': 'short_trading',
    'swing_trading': 'short_trading',
    'short_trading': 'short_trading',
    'arbitrage': 'short_trading',
    'custom': 'mixed',
    'mixed': 'mixed'
  };
  
  return strategyMap[primaryStrategy] || 'long_holding';
};

// Helper function to extract enhanced context from user message and strategy
const extractEnhancedContext = (userMessage, strategy, agent) => {
  const context = {};
  
  // Extract custom allocations from strategy (prioritize percentageAllocation)
  if (strategy.budgetRecommendation?.percentageAllocation || strategy.budgetRecommendation?.dollarAllocation) {
    const allocations = strategy.budgetRecommendation.percentageAllocation || strategy.budgetRecommendation.dollarAllocation;
    context.customAllocations = new Map(Object.entries(allocations));
  }
  
  // Extract user preferences from message
  const preferredTokens = [];
  const avoidTokens = [];
  const message = userMessage.toLowerCase();
  
  // Check for token preferences
  const tokens = ['btc', 'eth', 'sei', 'usdc', 'usdt', 'dai'];
  tokens.forEach(token => {
    if (message.includes(token)) {
      if (message.includes(`avoid ${token}`) || message.includes(`don't want ${token}`) || message.includes(`no ${token}`)) {
        avoidTokens.push(token.toUpperCase());
      } else {
        preferredTokens.push(token.toUpperCase());
      }
    }
  });
  
  // Extract custom instructions and preferences
  let customInstructions = '';
  let adjustmentReason = '';
  
  if (message.includes('change') || message.includes('adjust') || message.includes('modify')) {
    adjustmentReason = 'User requested changes from previous strategy';
  }
  
  if (message.includes('i want') || message.includes('i prefer') || message.includes('i need')) {
    customInstructions = userMessage;
  }
  
  // Extract market conditions if mentioned
  let marketConditions = '';
  if (message.includes('market') || message.includes('bull') || message.includes('bear') || message.includes('volatile')) {
    marketConditions = 'User mentioned market conditions: ' + userMessage;
  }
  
  context.userPreferences = {
    preferredTokens: preferredTokens.length > 0 ? preferredTokens : agent.configuration.preferredTokens,
    avoidTokens,
    customInstructions,
    tradingFrequency: agent.configuration.frequency
  };
  
  context.marketConditions = marketConditions;
  context.adjustmentReason = adjustmentReason;
  
  return context;
};

// @desc    Chat with crypto DCA expert agent
// @route   POST /api/agent/chat
// @access  Public
const chatWithAgent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { message, agentId } = req.body;

    // Check if Together AI is initialized
    if (!together || !process.env.TOGETHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured. Please set TOGETHER_API_KEY environment variable.'
      });
    }

    // Get agent if specified
    let agent = null;
    let systemPrompt = `You are a professional cryptocurrency trading and investment expert specializing in DEX strategies on the SEI network. Provide helpful advice about cryptocurrency trading and investment strategies.`;

    if (agentId) {
      agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }
      systemPrompt = agent.getSystemPrompt();
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const stream = await together.chat.completions.create({
      model: 'lgai/exaone-deep-32b',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
    }

    res.json({
      success: true,
      data: {
        response: fullResponse,
        agentId: agentId || null,
        agentName: agent?.name || 'General Assistant',
        metadata: {
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat request',
      error: error.message
    });
  }
};

// @desc    Get crypto prices for SEI network
// @route   GET /api/agent/prices
// @access  Public
const getCryptoPrices = async (req, res) => {
  try {
    // Mock data for SEI network - integrate with actual SEI DEX price feeds in production
    const mockPrices = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 43250.75,
        change24h: 2.3,
        volume24h: 1250000000,
        marketCap: 847500000000,
        network: 'sei',
        type: 'wrapped'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 2680.40,
        change24h: 1.8,
        volume24h: 890000000,
        marketCap: 322000000000,
        network: 'sei',
        type: 'wrapped'
      },
      {
        symbol: 'SEI',
        name: 'Sei',
        price: 0.45,
        change24h: 12.5,
        volume24h: 45000000,
        marketCap: 225000000,
        network: 'sei',
        type: 'native'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        price: 1.00,
        change24h: 0.1,
        volume24h: 2500000000,
        marketCap: 25000000000,
        network: 'sei',
        type: 'stablecoin'
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        price: 1.00,
        change24h: -0.05,
        volume24h: 3200000000,
        marketCap: 95000000000,
        network: 'sei',
        type: 'stablecoin'
      },
      {
        symbol: 'DAI',
        name: 'Dai',
        price: 1.00,
        change24h: 0.02,
        volume24h: 180000000,
        marketCap: 4200000000,
        network: 'sei',
        type: 'stablecoin'
      }
    ];

    res.json({
      success: true,
      data: {
        prices: mockPrices,
        timestamp: new Date().toISOString(),
        note: 'Mock data for SEI network - integrate with SEI DEX price feeds for production'
      }
    });

  } catch (error) {
    console.error('Prices Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve crypto prices',
      error: error.message
    });
  }
};

// @desc    Generate strategy using specific agent
// @route   POST /api/agent/strategy
// @access  Public
const generateDCAStrategy = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { message, agentId } = req.body;
    const sessionId = getSessionId(req);

    // Check if Together AI is initialized
    if (!together || !process.env.TOGETHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured. Please set TOGETHER_API_KEY environment variable.'
      });
    }

    // Get agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get previous memory context for this specific agent
    let memoryContext = '';
    try {
      memoryContext = await Memory.getMemoryContext(agentId, sessionId);
    } catch (error) {
      console.error('Error retrieving memory context:', error);
      memoryContext = "No previous interactions available with this agent.";
    }

    // Fetch live market data
    console.log('Fetching live market data...');
    const marketData = await fetchMarketData(agent.configuration.preferredTokens);
    const marketDataFormatted = formatMarketDataForAI(marketData);
    console.log('Market data fetched successfully');

    // Check if this is a continuing conversation
    const isNewConversation = memoryContext === "NEW_CONVERSATION";
    
    // Detect if user specified a budget
    const budgetMentioned = /\$[\d,]+|\d+\s*dollars?|\d+\s*k|\d+\s*thousand/i.test(message);
    
    const strategyPrompt = `${!isNewConversation ? '🧠 MEMORY CONTEXT:\n' + memoryContext + '\n\n' : ''}USER MESSAGE: "${message}"

AGENT CONFIG: ${agent.name} (${agent.primaryStrategy}) | Default Budget: $${agent.configuration.defaultBudget} | Risk: ${agent.configuration.riskTolerance} | Tokens: ${agent.configuration.preferredTokens.join(', ')}

${marketDataFormatted}

${!isNewConversation ? 
`📋 MEMORY-BASED INSTRUCTIONS:
- REFERENCE the last interaction from memory above
- If user is changing previous allocations, EXPLAIN what changed from before
- Build naturally on previous conversation
- Use previous preferences as starting point
- Be conversational and acknowledge the history

` : '🆕 NEW CONVERSATION INSTRUCTIONS:\n- This is the first interaction with this agent\n- Focus on user preferences and customization\n\n'}CRITICAL REQUIREMENTS:
1. ${!isNewConversation ? 'REFERENCE previous interaction and build upon it naturally' : 'Create initial strategy based on user message'}
2. Apply ${agent.primaryStrategy} strategy consistently
3. ${!budgetMentioned ? 'PROPOSE A BUDGET - User did not specify budget, so suggest appropriate amounts based on strategy' : 'Use the budget mentioned by user'}
4. ANALYZE LIVE MARKET DATA - Use the current market conditions, prices, and trends to inform your strategy
5. Use PERCENTAGE-based allocations (e.g., "40%", "30%", "20%", "10%") - NOT dollar amounts
6. Create detailed buy/sell actions for SEI network DEX with both percentages AND calculated dollar amounts
7. Include unique REF IDs for each trade
8. Provide clear user message explaining the strategy
9. Include market insights based on current data in your response

JSON RESPONSE FORMAT:
{
  "analysis": "Brief analysis of user request including market conditions",
  "extractedParameters": {
    "intent": "long_holding/short_trading/mixed",
    "mentionedCoins": ["BTC", "ETH"],
    "budgetHints": "user budget or proposed budget",
    "timeline": "short-term/long-term"
  },
  "strategy": "Strategy description based on market conditions",
  "budgetRecommendation": {
    ${!budgetMentioned ? '"proposedBudget": "$X recommended for this strategy",' : ''}
    "minimumBudget": "$X minimum needed",
    "recommendedBudget": "$X optimal amount", 
    "percentageAllocation": {
      "BTC": "40%",
      "ETH": "30%", 
      "SEI": "20%",
      "USDC": "10%"
    },
    "reasoning": "Why these percentages based on market conditions"
  },
  "actionPlan": [
    {
      "step": 1,
      "action": "BUY 40% allocation ($ equivalent)",
      "actionType": "BUY",
      "percentage": "40%",
      "dollarAmount": "$400",
      "tokenPair": "USDC/BTC",
      "ref": "unique_ref_id",
      "reasoning": "explanation considering market conditions"
    }
  ],
  "marketInsights": {
    "currentConditions": "market condition summary",
    "priceAnalysis": "key price movements",
    "recommendation": "market-based trading advice",
    "riskFactors": "current market risks"
  },
  "userMessage": "Conversational response to user including market context"
}

Available tokens: BTC, ETH, SEI, USDC, USDT, DAI | Actions: BUY/SELL | Network: SEI

${!isNewConversation ? 'Build upon the previous conversation naturally while creating new strategy.' : 'Create comprehensive new strategy based on user preferences.'}`;

    // Get agent's system prompt
    const systemPrompt = agent.getSystemPrompt();

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: strategyPrompt }
    ];

    const stream = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      messages,
      stream: true,
      temperature: 0.5,
      max_tokens: 4000
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Improved fallback response with percentage allocations and budget proposals
      const memoryNote = memoryContext !== "NEW_CONVERSATION" ? 
        "Building upon previous interactions with this agent. " : "";
      
      // Determine budget to use
      let budgetToUse = agent.configuration.defaultBudget;
      let budgetProposal = {};
      
      if (!budgetMentioned) {
        // Propose budget based on strategy and risk tolerance
        const strategyMultipliers = {
          'DCA': 1.0,
          'momentum_trading': 1.5,
          'swing_trading': 1.2,
          'hodl': 0.8,
          'arbitrage': 2.0,
          'custom': 1.0
        };
        
        const riskMultipliers = {
          'conservative': 0.7,
          'moderate': 1.0,
          'aggressive': 1.5
        };
        
        const proposedAmount = Math.floor(
          agent.configuration.defaultBudget * 
          (strategyMultipliers[agent.primaryStrategy] || 1.0) *
          (riskMultipliers[agent.configuration.riskTolerance] || 1.0)
        );
        
        budgetToUse = proposedAmount;
        budgetProposal.proposedBudget = `$${proposedAmount} recommended for ${agent.primaryStrategy} strategy with ${agent.configuration.riskTolerance} risk tolerance`;
      }
      
      parsedResponse = {
        analysis: `${memoryNote}Analysis of user message: "${message}" - Creating a ${agent.primaryStrategy} strategy for SEI network DEX trading using agent "${agent.name}" configuration. Market conditions: ${marketData.summary.marketCondition} with ${marketData.summary.volatility} volatility.`,
        extractedParameters: {
          intent: mapStrategyToEnum(agent.primaryStrategy),
          mentionedCoins: agent.configuration.preferredTokens,
          budgetHints: budgetMentioned ? `User specified budget in message` : `Proposed budget: $${budgetToUse}`,
          timeline: mapStrategyToEnum(agent.primaryStrategy) === 'long_holding' ? 'long-term' : 'short-term'
        },
        strategy: `${agent.primaryStrategy} strategy for SEI network DEX based on agent "${agent.name}" configuration and current market conditions (${marketData.summary.marketCondition}). ${memoryNote}${!budgetMentioned ? `Proposed budget of $${budgetToUse} based on your strategy and risk profile.` : ''}`,
        budgetRecommendation: {
          ...budgetProposal,
          minimumBudget: `$${Math.floor(budgetToUse * 0.5)} minimum needed for strategy`,
          recommendedBudget: `$${budgetToUse} optimal amount for this strategy`,
          percentageAllocation: {
            [agent.configuration.preferredTokens[0] || 'BTC']: "40%",
            [agent.configuration.preferredTokens[1] || 'ETH']: "30%", 
            [agent.configuration.preferredTokens[2] || 'SEI']: "20%",
            "USDC": "10%"
          },
          reasoning: `Percentage-based allocation for ${agent.primaryStrategy} strategy: 40% primary token, 30% diversification, 20% network exposure, 10% liquidity`
        },
        actionPlan: [
          {
            step: 1,
            action: `BUY 40% allocation (${Math.floor(budgetToUse * 0.4)} USD) in ${agent.configuration.preferredTokens[0]}`,
            actionType: "BUY",
            percentage: "40%",
            dollarAmount: `$${Math.floor(budgetToUse * 0.4)}`,
            tokenPair: `USDC/${agent.configuration.preferredTokens[0]}`,
            ref: `${agent.primaryStrategy}_${agent.configuration.preferredTokens[0]}_${Date.now()}_1`,
            reasoning: `Primary ${agent.primaryStrategy} allocation to ${agent.configuration.preferredTokens[0]}`
          },
          {
            step: 2,
            action: `BUY 30% allocation (${Math.floor(budgetToUse * 0.3)} USD) in ${agent.configuration.preferredTokens[1] || 'ETH'}`,
            actionType: "BUY",
            percentage: "30%",
            dollarAmount: `$${Math.floor(budgetToUse * 0.3)}`,
            tokenPair: `USDC/${agent.configuration.preferredTokens[1] || 'ETH'}`,
            ref: `${agent.primaryStrategy}_${agent.configuration.preferredTokens[1] || 'ETH'}_${Date.now()}_2`,
            reasoning: `Secondary diversification allocation for portfolio balance`
          },
          {
            step: 3,
            action: `BUY 20% allocation (${Math.floor(budgetToUse * 0.2)} USD) in ${agent.configuration.preferredTokens[2] || 'SEI'}`,
            actionType: "BUY",
            percentage: "20%",
            dollarAmount: `$${Math.floor(budgetToUse * 0.2)}`,
            tokenPair: `USDC/${agent.configuration.preferredTokens[2] || 'SEI'}`,
            ref: `${agent.primaryStrategy}_${agent.configuration.preferredTokens[2] || 'SEI'}_${Date.now()}_3`,
            reasoning: `SEI network exposure for ecosystem participation`
          },
          {
            step: 4,
            action: `Reserve 10% allocation (${Math.floor(budgetToUse * 0.1)} USD) in USDC for liquidity`,
            actionType: "HOLD",
            percentage: "10%",
            dollarAmount: `$${Math.floor(budgetToUse * 0.1)}`,
            tokenPair: "USDC/USDC",
            ref: `${agent.primaryStrategy}_USDC_${Date.now()}_4`,
            reasoning: `Liquidity buffer for opportunities and strategy adjustments`
          }
        ],
        marketInsights: {
          currentConditions: `Market is ${marketData.summary.marketCondition} with ${marketData.summary.volatility} volatility. Average 24h change: ${marketData.summary.avgChange24h}%.`,
          priceAnalysis: marketData.summary.topPerformer ? `Top performer: ${marketData.summary.topPerformer.token} (+${marketData.summary.topPerformer.change}%). ${marketData.summary.mostVolatile ? `Most volatile: ${marketData.summary.mostVolatile.token} (${marketData.summary.mostVolatile.volatility}%)` : ''}` : 'Market analysis unavailable.',
          recommendation: marketData.summary.recommendation,
          riskFactors: marketData.summary.volatility === 'high' ? 'High volatility detected - consider smaller position sizes' : marketData.summary.volatility === 'medium' ? 'Moderate volatility - standard risk management applies' : 'Low volatility - favorable for planned entries'
        },
        userMessage: `${memoryNote}Using your "${agent.name}" agent with ${agent.primaryStrategy} strategy, I've created a percentage-based strategy${!budgetMentioned ? ` with a proposed budget of $${budgetToUse}` : ''} based on your message and current market conditions. Market is ${marketData.summary.marketCondition} with ${marketData.summary.volatility} volatility. This agent uses ${agent.configuration.riskTolerance} risk tolerance and focuses on ${agent.configuration.preferredTokens.join(', ')} with a 40%-30%-20%-10% allocation structure optimized for current market conditions.`
      };
    }

    // Save interaction to memory with enhanced context
    try {
      const budgetAmount = extractBudgetAmount(parsedResponse);
      const enhancedContext = extractEnhancedContext(message, parsedResponse, agent);
      
      // Get previous allocations for comparison
      const previousMemories = await Memory.getRecentMemories(agentId, sessionId, 1);
      let previousAllocations = new Map();
      if (previousMemories.length > 0 && previousMemories[0].customAllocations) {
        previousAllocations = new Map(Object.entries(previousMemories[0].customAllocations));
      }
      
      // Sanitize the parsed response to ensure valid enum values
      const sanitizedIntent = mapStrategyToEnum(parsedResponse.extractedParameters?.intent || agent.primaryStrategy);
      
      const memoryData = {
        userId: agent.userId,
        agentId: agentId,
        sessionId,
        userMessage: message,
        extractedParameters: {
          ...parsedResponse.extractedParameters,
          ...enhancedContext,
          intent: sanitizedIntent  // Override with sanitized value
        },
        strategyType: sanitizedIntent,
        budgetAmount,
        actions: parsedResponse.actionPlan?.map(action => ({
          step: action.step,
          actionType: action.actionType,
          percentage: action.percentage || action.percentageAmount || 'N/A',
          dollarAmount: parseFloat(action.dollarAmount?.replace(/\$/, '') || '0'),
          tokenPair: action.tokenPair,
          ref: action.ref,
          priority: action.priority || 'medium',
          timeframe: action.timeframe || 'immediate',
          holdingPeriod: action.holdingPeriod,
          reasoning: action.reasoning
        })) || [],
        conversationContext: {
          previousAllocations,
          userFeedback: enhancedContext.adjustmentReason || '',
          strategyAdjustments: enhancedContext.adjustmentReason ? [enhancedContext.adjustmentReason] : [],
          learningNotes: `User prefers ${enhancedContext.userPreferences?.preferredTokens?.join(', ')} tokens. ${enhancedContext.userPreferences?.customInstructions || ''}`,
          customizationLevel: enhancedContext.userPreferences?.customInstructions ? 'intermediate' : 'basic',
          marketConditions: `${marketData.summary.marketCondition} market with ${marketData.summary.volatility} volatility`,
          marketTimestamp: marketData.timestamp
        },
        summary: parsedResponse.userMessage || parsedResponse.strategy || 'Strategy generated',
        outcome: 'pending'
      };

      const memory = new Memory(memoryData);
      await memory.save();
      
      // Update agent statistics
      await agent.updateStats(budgetAmount);
      
      console.log('Enhanced memory saved successfully for agent:', agentId);
    } catch (memoryError) {
      console.error('Error saving memory:', memoryError);
      // Continue execution even if memory save fails
    }

    res.json({
      success: true,
      data: {
        strategy: parsedResponse,
        agent: {
          id: agent._id,
          name: agent.name,
          primaryStrategy: agent.primaryStrategy,
          configuration: agent.configuration
        },
        originalMessage: message,
        sessionId,
        memoryContext: memoryContext !== "NEW_CONVERSATION" ? "Previous interactions considered and referenced" : "No previous interactions",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Strategy Generation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate strategy',
      error: error.message
    });
  }
};

module.exports = {
  chatWithAgent,
  getCryptoPrices,
  generateDCAStrategy
}; 