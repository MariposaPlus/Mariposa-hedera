const { validationResult } = require('express-validator');
const Together = require('together-ai').default;
const Memory = require('../models/Memory');
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

// Helper function to generate session ID
const getSessionId = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `${ip}_${userAgent}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
};

// Helper function to map action types to valid enum values
const mapActionType = (actionType) => {
  const actionMap = {
    'buy': 'BUY',
    'sell': 'SELL',
    'hold': 'HOLD',
    'stake': 'STAKE',
    'swap': 'SWAP',
    'farm': 'FARM',
    'lend': 'LEND',
    'borrow': 'BORROW',
    'bridge': 'BRIDGE',
    'mint': 'MINT',
    'burn': 'BURN',
    'send': 'SWAP', // Map send to swap as closest equivalent
    'transfer': 'SWAP', // Map transfer to swap
    'exchange': 'SWAP', // Map exchange to swap
    'trade': 'SWAP', // Map trade to swap
    'deposit': 'LEND', // Map deposit to lend
    'withdraw': 'SELL', // Map withdraw to sell
    'unknown': 'HOLD' // Default fallback
  };
  
  const normalizedAction = (actionType || 'unknown').toLowerCase();
  return actionMap[normalizedAction] || 'HOLD';
};

// Demand classification LLM
const classifyDemand = async (userMessage) => {
  const classificationPrompt = `You are a demand classifier for a cryptocurrency trading assistant. Analyze the user's message and classify it into one of these 4 categories:

1. "action" - User wants to perform trading actions (buy, sell, transfer, stake, swap, send, etc.)
2. "strategy" - User wants to CREATE a specific trading strategy, portfolio plan, or investment framework (e.g., "create a DCA strategy", "build me a portfolio", "I need an investment plan")
3. "information" - User wants market data, price info, explanations, investment opinions, opportunity analysis, or general crypto information (e.g., "is X a good investment?", "should I buy Y?", "what's the price of Z?")
4. "feedback" - User is providing feedback about trades, asking for performance evaluation, or seeking validation

Key distinction: Questions about investment opportunities, market timing, or investment opinions are "information" requests, not "strategy" creation requests.

Respond with ONLY the category name (action/strategy/information/feedback) and a brief 1-sentence explanation.

User message: "${userMessage}"

Format your response as:
CATEGORY: [action/strategy/information/feedback]
REASON: [brief explanation]`;

  try {
    const response = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: classificationPrompt }],
      temperature: 0.3,
      max_tokens: 150
    });

    const content = response.choices[0]?.message?.content || '';
    const categoryMatch = content.match(/CATEGORY:\s*(action|strategy|information|feedback)/i);
    const reasonMatch = content.match(/REASON:\s*(.+)/i);

    return {
      category: categoryMatch ? categoryMatch[1].toLowerCase() : 'information',
      reason: reasonMatch ? reasonMatch[1].trim() : 'Unable to determine specific reason'
    };
  } catch (error) {
    console.error('Demand classification error:', error);
    return { category: 'information', reason: 'Classification failed, defaulting to information' };
  }
};

// Action demand handler
const handleActionDemand = async (userMessage, sessionId, marketDataArray) => {
  // Convert array back to the format expected by the prompts
  const marketData = marketDataArray;
  console.log('🎯 PROCESSING ACTION DEMAND');
  
  // Step 1: Extract action parameters
  const parameterExtractionPrompt = `You are an action parameter extractor for cryptocurrency trading. Extract specific details from the user's request.

User message: "${userMessage}"
Current market data: ${JSON.stringify(marketData.slice(0, 5))}

Extract and provide:
1. Action type (buy, sell, transfer, stake, swap, send, etc.)
2. Token/coin involved
3. Amount (if specified)
4. Target/recipient (if transfer/send)
5. Urgency level (immediate, within hours, flexible)
6. Any special conditions

Format as JSON:
{
  "actionType": "string",
  "token": "string",
  "amount": "string or null",
  "target": "string or null",
  "urgency": "immediate/hours/flexible",
  "conditions": "string or null",
  "needsWalletAccess": boolean
}`;

  try {
    const paramResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: parameterExtractionPrompt }],
      temperature: 0.4,
      max_tokens: 300
    });

    let extractedParams;
    try {
      const paramContent = paramResponse.choices[0]?.message?.content || '{}';
      extractedParams = JSON.parse(paramContent.match(/\{[\s\S]*\}/)?.[0] || '{}');
    } catch {
      extractedParams = { actionType: 'unknown', needsWalletAccess: true };
    }

    // Step 2: Generate action plan
    const actionPlanPrompt = `You are a cryptocurrency trading action planner. Create a detailed execution plan for the user's request.

User request: "${userMessage}"
Extracted parameters: ${JSON.stringify(extractedParams)}
Market data: ${JSON.stringify(marketData.slice(0, 5))}

Provide:
1. Step-by-step execution plan
2. Risk assessment
3. Current market considerations
4. Required preparations
5. Expected outcomes
6. Alternative options if applicable

Be specific about wallet connections, gas fees, slippage, timing, and any risks.`;

    const planResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: actionPlanPrompt }],
      temperature: 0.6,
      max_tokens: 800
    });

    const actionPlan = planResponse.choices[0]?.message?.content || 'Unable to generate action plan';

    // Save to memory
    await Memory.create({
      userId: 'anonymous',
      sessionId,
      agentId: 'agent-chat-system',
      userMessage,
      extractedParameters: {
        intent: 'mixed', // Use valid enum value for action requests
        customAllocations: new Map(),
        userPreferences: {
          actionType: extractedParams.actionType,
          targetToken: extractedParams.token,
          urgency: extractedParams.urgency
        }
      },
      strategyType: 'chat_conversation',
      demandType: 'ACTION',
      demandReason: `User requested ${extractedParams.actionType} action for ${extractedParams.token}`,
      actions: [{
        step: 1,
        actionType: mapActionType(extractedParams.actionType),
        tokenPair: extractedParams.token || 'UNKNOWN',
        priority: extractedParams.urgency === 'immediate' ? 'high' : 'medium',
        reasoning: actionPlan.substring(0, 200)
      }],
      aiResponse: actionPlan,
      metadata: {
        demandType: 'action',
        extractedParams,
        timestamp: new Date()
      }
    });

    return {
      demandType: 'action',
      extractedParameters: extractedParams,
      actionPlan,
      recommendations: [
        'Ensure wallet is connected and has sufficient balance',
        'Check current gas fees before executing',
        'Consider market volatility and timing',
        extractedParams.needsWalletAccess ? 'Wallet access required for this action' : null
      ].filter(Boolean)
    };

  } catch (error) {
    console.error('Action handling error:', error);
    throw error;
  }
};

// Strategy demand handler
const handleStrategyDemand = async (userMessage, sessionId, marketDataArray) => {
  // Convert array back to the format expected by the prompts
  const marketData = marketDataArray;
  console.log('📊 PROCESSING STRATEGY DEMAND');

  // Step 1: Extract strategy parameters
  const strategyExtractionPrompt = `You are a strategy parameter extractor. Analyze the user's request for investment strategy advice.

User message: "${userMessage}"
Market data: ${JSON.stringify(marketData.slice(0, 5))}

Extract:
1. Investment amount/budget
2. Risk tolerance (conservative/moderate/aggressive)
3. Time horizon (short/medium/long term)
4. Preferred tokens/sectors
5. Strategy type preference (DCA, swing trading, hodl, etc.)
6. Specific goals or constraints

Format as JSON:
{
  "budget": "string or null",
  "riskTolerance": "conservative/moderate/aggressive",
  "timeHorizon": "short/medium/long",
  "preferredTokens": ["array"],
  "strategyType": "string",
  "goals": "string",
  "constraints": "string or null"
}`;

  try {
    const strategyResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: strategyExtractionPrompt }],
      temperature: 0.4,
      max_tokens: 300
    });

    let strategyParams;
    try {
      const strategyContent = strategyResponse.choices[0]?.message?.content || '{}';
      strategyParams = JSON.parse(strategyContent.match(/\{[\s\S]*\}/)?.[0] || '{}');
    } catch {
      strategyParams = { riskTolerance: 'moderate', timeHorizon: 'medium' };
    }

    // Step 2: Generate comprehensive strategy
    const strategyGenerationPrompt = `You are a professional cryptocurrency investment strategist. Create a detailed investment strategy based on the user's requirements.

User request: "${userMessage}"
Strategy parameters: ${JSON.stringify(strategyParams)}
Current market data: ${JSON.stringify(marketData)}

Provide a comprehensive strategy including:
1. Portfolio allocation recommendations
2. Entry and exit strategies
3. Risk management approach
4. Dollar-cost averaging suggestions if applicable
5. Rebalancing schedule
6. Market condition adaptations
7. Specific action steps with percentages
8. Timeline and milestones

Focus on SEI network tokens and provide specific percentages for allocations.`;

    const strategyGenResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: strategyGenerationPrompt }],
      temperature: 0.6,
      max_tokens: 1200
    });

    const strategyPlan = strategyGenResponse.choices[0]?.message?.content || 'Unable to generate strategy';

    // Extract allocation percentages from strategy
    const allocationMatches = strategyPlan.match(/(\w+):\s*(\d+)%/g) || [];
    const allocations = new Map();
    allocationMatches.forEach(match => {
      const [token, percentage] = match.split(':');
      allocations.set(token.trim(), percentage.trim());
    });

    // Save to memory
    await Memory.create({
      userId: 'anonymous',
      sessionId,
      agentId: 'agent-chat-system',
      userMessage,
      extractedParameters: {
        intent: strategyParams.timeHorizon === 'long' ? 'long_holding' : 'mixed',
        riskIndicators: strategyParams.riskTolerance,
        budgetHints: strategyParams.budget,
        timeline: strategyParams.timeHorizon,
        customAllocations: allocations,
        userPreferences: {
          preferredTokens: strategyParams.preferredTokens || [],
          customInstructions: strategyParams.goals
        }
      },
      strategyType: strategyParams.timeHorizon === 'long' ? 'long_holding' : 'mixed',
      demandType: 'STRATEGY',
      demandReason: `User requested ${strategyParams.timeHorizon}-term investment strategy`,
      budgetAmount: strategyParams.budget ? parseFloat(strategyParams.budget.replace(/[^0-9.]/g, '')) || 0 : 0,
      aiResponse: strategyPlan,
      metadata: {
        demandType: 'strategy',
        strategyParams,
        allocations: Object.fromEntries(allocations),
        timestamp: new Date()
      }
    });

    return {
      demandType: 'strategy',
      strategyParameters: strategyParams,
      strategyPlan,
      allocations: Object.fromEntries(allocations),
      recommendations: [
        'Start with a small test allocation',
        'Monitor market conditions regularly',
        'Stick to your risk tolerance',
        'Consider dollar-cost averaging for volatility reduction'
      ]
    };

  } catch (error) {
    console.error('Strategy handling error:', error);
    throw error;
  }
};

// Information demand handler
const handleInformationDemand = async (userMessage, sessionId, marketDataArray) => {
  // Convert array back to the format expected by the prompts
  const marketData = marketDataArray;
  console.log('📚 PROCESSING INFORMATION DEMAND');

  // Step 1: Categorize information request
  const infoCategoryPrompt = `Categorize this information request:

User message: "${userMessage}"

Categories:
1. "price" - Price quotes, market data, token values
2. "market" - Market analysis, trends, conditions
3. "technical" - How-to guides, explanations, tutorials
4. "news" - Recent developments, updates, events
5. "comparison" - Token/strategy/platform comparisons

Respond with category and specific data needed.

Format:
CATEGORY: [category]
DATA_NEEDED: [specific information required]`;

  try {
    const categoryResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: infoCategoryPrompt }],
      temperature: 0.3,
      max_tokens: 150
    });

    const categoryContent = categoryResponse.choices[0]?.message?.content || '';
    const category = categoryContent.match(/CATEGORY:\s*(\w+)/i)?.[1] || 'general';
    const dataNeeded = categoryContent.match(/DATA_NEEDED:\s*(.+)/i)?.[1] || userMessage;

    // Step 2: Gather relevant information
    let contextData = '';
    if (category === 'price' || category === 'market') {
      contextData = `Current market data: ${JSON.stringify(marketData)}`;
    }

    // Step 3: Generate comprehensive response
    const informationPrompt = `You are a knowledgeable cryptocurrency expert. Provide detailed, accurate information based on the user's question.

User question: "${userMessage}"
Information category: ${category}
Data needed: ${dataNeeded}
${contextData}

Provide:
1. Direct answer to the question
2. Relevant context and background
3. Current market implications if applicable
4. Additional useful information
5. Actionable insights or next steps

Be thorough but concise. Include specific numbers, percentages, and examples where relevant.`;

    const infoResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: informationPrompt }],
      temperature: 0.5,
      max_tokens: 1000
    });

    const informationAnswer = infoResponse.choices[0]?.message?.content || 'Unable to provide information';

    // Save to memory
    await Memory.create({
      userId: 'anonymous',
      sessionId,
      agentId: 'agent-chat-system',
      userMessage,
      extractedParameters: {
        intent: 'mixed', // Use valid enum value for information requests
        customAllocations: new Map(),
        userPreferences: {
          informationType: category,
          specificQuery: dataNeeded
        }
      },
      strategyType: 'chat_conversation',
      demandType: 'INFORMATION',
      demandReason: `User requested ${category} information`,
      aiResponse: informationAnswer,
      metadata: {
        demandType: 'information',
        category,
        dataNeeded,
        timestamp: new Date()
      }
    });

    return {
      demandType: 'information',
      category,
      answer: informationAnswer,
      relatedData: category === 'price' ? marketData.slice(0, 5) : null,
      suggestions: [
        'Ask follow-up questions for more details',
        'Check our market data for real-time updates',
        'Consider how this information affects your strategy'
      ]
    };

  } catch (error) {
    console.error('Information handling error:', error);
    throw error;
  }
};

// Feedback demand handler
const handleFeedbackDemand = async (userMessage, sessionId, marketDataArray) => {
  // Convert array back to the format expected by the prompts
  const marketData = marketDataArray;
  console.log('💭 PROCESSING FEEDBACK DEMAND');

  // Step 1: Extract feedback context
  const feedbackExtractionPrompt = `Extract feedback context from the user's message:

User message: "${userMessage}"

Extract:
1. What trade/investment they made
2. Amount/value involved
3. Timeframe of the trade
4. Their sentiment (positive/negative/neutral)
5. Specific concerns or questions
6. Whether they want validation or advice

Format as JSON:
{
  "tradeDetails": "string",
  "amount": "string or null",
  "timeframe": "string or null",
  "sentiment": "positive/negative/neutral",
  "concerns": "string or null",
  "wantsAdvice": boolean
}`;

  try {
    const feedbackResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: feedbackExtractionPrompt }],
      temperature: 0.4,
      max_tokens: 300
    });

    let feedbackParams;
    try {
      const feedbackContent = feedbackResponse.choices[0]?.message?.content || '{}';
      feedbackParams = JSON.parse(feedbackContent.match(/\{[\s\S]*\}/)?.[0] || '{}');
    } catch {
      feedbackParams = { sentiment: 'neutral', wantsAdvice: true };
    }

    // Step 2: Generate feedback response with market context
    const feedbackAnalysisPrompt = `You are a cryptocurrency trading advisor providing feedback analysis.

User's situation: "${userMessage}"
Extracted context: ${JSON.stringify(feedbackParams)}
Current market data: ${JSON.stringify(marketData.slice(0, 5))}

Provide:
1. Assessment of their trade/decision
2. Market context analysis
3. Performance evaluation if applicable
4. Risk assessment
5. Future recommendations
6. Psychological support and guidance
7. Next steps they should consider

Be supportive but honest. Include specific market data and percentages where relevant.`;

    const analysisResponse = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: feedbackAnalysisPrompt }],
      temperature: 0.6,
      max_tokens: 1000
    });

    const feedbackAnalysis = analysisResponse.choices[0]?.message?.content || 'Unable to provide feedback analysis';

    // Save to memory
    await Memory.create({
      userId: 'anonymous',
      sessionId,
      agentId: 'agent-chat-system',
      userMessage,
      extractedParameters: {
        intent: 'mixed', // Use valid enum value for feedback requests
        customAllocations: new Map(),
        userPreferences: {
          tradeContext: feedbackParams.tradeDetails,
          sentiment: feedbackParams.sentiment,
          needsAdvice: feedbackParams.wantsAdvice
        }
      },
      strategyType: 'chat_conversation',
      demandType: 'FEEDBACK',
      demandReason: `User provided feedback with ${feedbackParams.sentiment} sentiment`,
      aiResponse: feedbackAnalysis,
      metadata: {
        demandType: 'feedback',
        feedbackParams,
        timestamp: new Date()
      }
    });

    return {
      demandType: 'feedback',
      feedbackContext: feedbackParams,
      analysis: feedbackAnalysis,
      marketContext: marketData.slice(0, 3),
      supportiveActions: [
        'Continue monitoring your position',
        'Consider your long-term strategy',
        'Don\'t let emotions drive decisions',
        feedbackParams.wantsAdvice ? 'Feel free to ask for specific advice' : null
      ].filter(Boolean)
    };

  } catch (error) {
    console.error('Feedback handling error:', error);
    throw error;
  }
};

// Main agent chat endpoint
const agentChat = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { message } = req.body;
    const sessionId = getSessionId(req);

    console.log('\n🤖 AGENT-CHAT REQUEST');
    console.log('═'.repeat(60));
    console.log('📱 Session ID:', sessionId);
    console.log('💬 Message:', message);

    // Check if Together AI is initialized
    if (!together || !process.env.TOGETHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured. Please set TOGETHER_API_KEY environment variable.'
      });
    }

    // Step 1: Fetch current market data
    console.log('📊 Fetching market data...');
    const marketDataResponse = await fetchMarketData();
    const marketData = Object.entries(marketDataResponse.tokens).map(([symbol, data]) => ({
      symbol,
      ...data
    }));

    // Step 2: Classify demand type
    console.log('🔍 Classifying demand type...');
    const { category, reason } = await classifyDemand(message);
    console.log(`📋 Demand Type: ${category.toUpperCase()}`);
    console.log(`💡 Reason: ${reason}`);

    // Step 3: Route to appropriate handler
    let result;
    switch (category) {
      case 'action':
        result = await handleActionDemand(message, sessionId, marketData);
        break;
      case 'strategy':
        result = await handleStrategyDemand(message, sessionId, marketData);
        break;
      case 'information':
        result = await handleInformationDemand(message, sessionId, marketData);
        break;
      case 'feedback':
        result = await handleFeedbackDemand(message, sessionId, marketData);
        break;
      default:
        result = await handleInformationDemand(message, sessionId, marketData);
    }

    console.log('✅ AGENT-CHAT COMPLETED');
    console.log('═'.repeat(60));

    res.json({
      success: true,
      data: {
        sessionId,
        demandClassification: {
          category,
          reason
        },
        ...result,
        marketData: marketData.slice(0, 5), // Include top 5 market data points
        timestamp: new Date().toISOString(),
        metadata: {
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          processedSteps: ['demand_classification', `${category}_handling`, 'response_generation'],
          memoryStored: true
        }
      }
    });

  } catch (error) {
    console.error('❌ AGENT-CHAT ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process agent chat request',
      error: error.message
    });
  }
};

module.exports = {
  agentChat
}; 