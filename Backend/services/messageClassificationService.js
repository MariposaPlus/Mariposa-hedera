const Together = require('together-ai').default;

// Initialize Together AI for message classification
let together;
try {
  together = new Together({
    apiKey: process.env.TOGETHER_API_KEY || 'dummy-key'
  });
} catch (error) {
  console.warn('Together AI not initialized for message classification. Please set TOGETHER_API_KEY environment variable.');
  together = null;
}

class MessageClassificationService {
  /**
   * First Layer: Classify message type using LLM
   * @param {string} message - User's message
   * @returns {Object} Classification result with type and confidence
   */
  async classifyMessage(message) {
    if (!together) {
      throw new Error('Together AI not initialized');
    }

    try {
      const classificationPrompt = this.buildClassificationPrompt(message);
      
      const response = await together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: classificationPrompt.system
          },
          {
            role: 'user',
            content: classificationPrompt.user
          }
        ],
        max_tokens: 200,
        temperature: 0.1, // Low temperature for consistent classification
        response_format: { type: 'json_object' }
      });

      const classification = JSON.parse(response.choices[0].message.content);
      
      // Validate and normalize the classification
      return this.validateClassification(classification, message);

    } catch (error) {
      console.error('Message classification error:', error);
      
      // Fallback to rule-based classification
      return await this.fallbackClassification(message);
    }
  }

  /**
   * Build classification prompt for LLM
   * @param {string} message - User's message
   * @returns {Object} System and user prompts
   */
  buildClassificationPrompt(message) {
    const system = `You are a message classifier for a crypto trading platform. Your job is to analyze user messages and classify them into exactly one of these 4 categories:

1. **strategy**: User wants to CREATE, BUILD, or DEVELOP a specific trading strategy, portfolio plan, investment framework, or has investment goals they want to achieve
   - Examples: "Create a DCA strategy for me", "Build me a portfolio plan", "Design an investment strategy", "Help me create a trading plan"
   - INVESTMENT GOALS: "I have $100 and want to double it", "I need to grow my $500", "Help me turn $1000 into $2000", "I want to make money from my investment"
   - Key: User is asking to CREATE something new OR has specific financial goals they want to achieve

2. **actions**: User wants to perform specific blockchain actions
   - Examples: "Swap my ETH for BTC", "Transfer 100 USDC to my friend", "Stake my SEI tokens", "Lend my USDT"
   - Key: User wants to DO something specific

3. **information**: User asking for market data, analysis, opinions on existing opportunities, or educational content
   - Examples: "Is Bitcoin a good investment now?", "What's the current price of ETH?", "Should I buy this token?", "How does staking work?", "Is this a good time to invest?"
   - Key: User is asking ABOUT something existing, not creating new strategies or stating investment goals

4. **feedbacks**: User completed an action/strategy and wants recommendations or feedback
   - Examples: "I just bought BTC, what should I do next?", "I made this trade, was it good?", "I lost money, what went wrong?"
   - Key: User is asking for feedback on completed actions

CRITICAL: If a user mentions having a specific amount of money and wants to grow/double/increase it, this is ALWAYS a **strategy** request, not information.

Respond with a JSON object containing:
{
  "type": "strategy|actions|information|feedbacks",
  "confidence": 0.1-1.0,
  "reasoning": "brief explanation",
  "keywords": ["array", "of", "key", "words"],
  "actionSubtype": "only if type is actions, specify: transfer|swap|stake|lend|borrow|bridge|buy|sell|mint|burn|other"
}`;

    const user = `Classify this user message: "${message}"`;

    return { system, user };
  }

  /**
   * Validate and normalize classification result
   * @param {Object} classification - Raw classification from LLM
   * @param {string} originalMessage - Original user message
   * @returns {Object} Validated classification
   */
  validateClassification(classification, originalMessage) {
    const validTypes = ['strategy', 'actions', 'information', 'feedbacks'];
    const validActionSubtypes = [
      'transfer', 'swap', 'stake', 'lend', 'borrow', 'bridge', 
      'buy', 'sell', 'mint', 'burn', 'other'
    ];

    // Validate type
    if (!classification.type || !validTypes.includes(classification.type)) {
      classification.type = this.inferTypeFromMessage(originalMessage);
    }

    // Validate confidence
    if (!classification.confidence || classification.confidence < 0.1 || classification.confidence > 1.0) {
      classification.confidence = 0.7; // Default confidence
    }

    // Validate action subtype
    if (classification.type === 'actions') {
      if (!classification.actionSubtype || !validActionSubtypes.includes(classification.actionSubtype)) {
        classification.actionSubtype = this.inferActionSubtype(originalMessage);
      }
    } else {
      classification.actionSubtype = null;
    }

    // Ensure keywords exist
    if (!classification.keywords || !Array.isArray(classification.keywords)) {
      classification.keywords = this.extractKeywords(originalMessage);
    }

    // Ensure reasoning exists
    if (!classification.reasoning) {
      classification.reasoning = `Classified as ${classification.type} based on message content`;
    }

    return {
      type: classification.type,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      keywords: classification.keywords,
      actionSubtype: classification.actionSubtype,
      originalMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Fallback rule-based classification when LLM fails
   * @param {string} message - User's message
   * @returns {Object} Classification result
   */
  async fallbackClassification(message) {
    const lowerMessage = message.toLowerCase();
    
    // Action keywords
    const actionKeywords = [
      'swap', 'transfer', 'send', 'stake', 'lend', 'borrow', 'bridge',
      'buy', 'sell', 'trade', 'exchange', 'mint', 'burn', 'deposit', 'withdraw'
    ];

    // Strategy creation keywords (user wants to CREATE something OR has investment goals)
    const strategyKeywords = [
      'create', 'build', 'design', 'make me', 'help me create', 'develop',
      'set up', 'construct', 'formulate', 'plan for me', 'double it', 'triple it',
      'grow my', 'increase my', 'turn my', 'make money', 'investment goal',
      'want to make', 'need to grow', 'dollars and', 'have $', 'have 100'
    ];

    // Information keywords (user is asking ABOUT something)
    const infoKeywords = [
      'price', 'chart', 'analysis', 'how does', 'what is', 'explain',
      'current', 'market', 'news', 'update', 'should i', 'is it good',
      'worth investing', 'opinion on', 'thoughts on', 'recommend'
    ];

    // Feedback keywords
    const feedbackKeywords = [
      'just bought', 'just sold', 'made a trade', 'completed', 'finished',
      'what next', 'did i do right', 'was this good', 'lost money'
    ];

    // Check for swap actions specifically (higher priority)
    const swapIntent = await this.detectSwapIntent(message);
    if (swapIntent.isSwap) {
      return {
        type: 'actions',
        confidence: 0.9,
        reasoning: 'Detected swap/exchange action',
        keywords: this.extractKeywords(message),
        actionSubtype: 'swap',
        swapDetails: swapIntent,
        originalMessage: message,
        timestamp: new Date().toISOString()
      };
    }

    // Check for other action keywords
    if (actionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'actions',
        confidence: 0.8,
        reasoning: 'Detected action keywords in message',
        keywords: this.extractKeywords(message),
        actionSubtype: this.inferActionSubtype(message),
        originalMessage: message,
        timestamp: new Date().toISOString()
      };
    }

    // Check for information keywords or question marks (prioritize over strategy)
    if (infoKeywords.some(keyword => lowerMessage.includes(keyword)) || message.includes('?')) {
      return {
        type: 'information',
        confidence: 0.8,
        reasoning: 'Detected information request or question',
        keywords: this.extractKeywords(message),
        actionSubtype: null,
        originalMessage: message,
        timestamp: new Date().toISOString()
      };
    }

    // Check for strategy keywords (creation-focused)
    if (strategyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'strategy',
        confidence: 0.7,
        reasoning: 'Detected strategy creation keywords in message',
        keywords: this.extractKeywords(message),
        actionSubtype: null,
        originalMessage: message,
        timestamp: new Date().toISOString()
      };
    }

    // Check for feedback keywords
    if (feedbackKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'feedbacks',
        confidence: 0.8,
        reasoning: 'Detected feedback keywords in message',
        keywords: this.extractKeywords(message),
        actionSubtype: null,
        originalMessage: message,
        timestamp: new Date().toISOString()
      };
    }

    // Default fallback
    return {
      type: 'information',
      confidence: 0.5,
      reasoning: 'Default classification when no clear pattern detected',
      keywords: this.extractKeywords(message),
      actionSubtype: null,
      originalMessage: message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Infer message type from keywords
   * @param {string} message - User's message
   * @returns {string} Inferred type
   */
  inferTypeFromMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    if (['swap', 'transfer', 'send', 'stake', 'lend'].some(word => lowerMessage.includes(word))) {
      return 'actions';
    }
    if (['create', 'build', 'design', 'make me', 'help me create', 'double it', 'triple it', 'grow my', 'turn my', 'have $', 'have 100'].some(word => lowerMessage.includes(word))) {
      return 'strategy';
    }
    if (['just', 'completed', 'made'].some(word => lowerMessage.includes(word))) {
      return 'feedbacks';
    }
    if (['should i', 'is it good', 'worth investing', 'opinion on', 'price', 'analysis'].some(word => lowerMessage.includes(word))) {
      return 'information';
    }
    
    return 'information';
  }

  /**
   * Infer action subtype from message
   * @param {string} message - User's message
   * @returns {string} Action subtype
   */
  inferActionSubtype(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('swap') || lowerMessage.includes('exchange')) return 'swap';
    if (lowerMessage.includes('transfer') || lowerMessage.includes('send')) return 'transfer';
    if (lowerMessage.includes('stake')) return 'stake';
    if (lowerMessage.includes('lend') || lowerMessage.includes('deposit')) return 'lend';
    if (lowerMessage.includes('borrow')) return 'borrow';
    if (lowerMessage.includes('bridge')) return 'bridge';
    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) return 'buy';
    if (lowerMessage.includes('sell')) return 'sell';
    if (lowerMessage.includes('mint')) return 'mint';
    if (lowerMessage.includes('burn')) return 'burn';
    
    return 'other';
  }

  /**
   * Detect swap intent from user message using LLM ONLY
   * @param {string} message - User's message
   * @returns {Object} Swap intent details
   */
  async detectSwapIntent(message) {
    try {
      console.log('🤖 Message Classification: Using LLM for swap detection');
      
      // Use SaucerSwap service for LLM-based parsing
      const SaucerSwapService = require('./saucerSwapService');
      const saucerSwapService = new SaucerSwapService();
      
      const swapIntent = await saucerSwapService.parseSwapIntentWithLLM(message);
      
      if (swapIntent.isSwap) {
        console.log('✅ LLM detected valid swap intent');
        return {
          isSwap: true,
          fromToken: swapIntent.fromToken,
          toToken: swapIntent.toToken,
          amount: swapIntent.amount,
          confidence: swapIntent.confidence || 0.9,
          parsingMethod: swapIntent.parsingMethod || 'llm',
          llmResponse: swapIntent.llmResponse
        };
      }
      
      console.log('ℹ️ LLM determined message is not a swap');
      return { 
        isSwap: false,
        parsingMethod: swapIntent.parsingMethod || 'llm'
      };
      
    } catch (error) {
      console.error('❌ LLM swap detection error:', error.message);
      
      // Return error instead of fallback to ensure we always use LLM
      return {
        isSwap: false,
        error: `Swap detection failed: ${error.message}`,
        parsingMethod: 'failed'
      };
    }
  }

  /**
   * Detect swap intent using regex (DEPRECATED - use LLM only)
   * @param {string} message - User's message  
   * @returns {Object} Swap intent details
   */
  detectSwapIntentRegex(message) {
    console.warn('⚠️ DEPRECATED: detectSwapIntentRegex should not be used. Use LLM-based detection instead.');
    // Return empty result to force use of LLM
    return {
      isSwap: false,
      error: 'Regex detection deprecated - use LLM detection',
      parsingMethod: 'deprecated'
    };
    const lowerMessage = message.toLowerCase();
    
    // Various swap patterns
    const patterns = [
      // "swap 100 HBAR for USDC"
      /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,
      // "exchange 50 SAUCE to HBAR"
      /exchange\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,
      // "convert 1000 USDC to HBAR"
      /convert\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,
      // "trade HBAR for SAUCE"
      /trade\s+(?:(\d+(?:\.\d+)?)\s+)?(\w+)\s+(?:for|to)\s+(\w+)/i,
      // "I want to swap HBAR to USDC"
      /(?:want to|need to|can you)\s+swap\s+(?:(\d+(?:\.\d+)?)\s+)?(\w+)\s+(?:for|to)\s+(\w+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        let amount, fromToken, toToken;
        
        if (match.length === 4) {
          [, amount, fromToken, toToken] = match;
        } else if (match.length === 5) {
          [, amount, fromToken, toToken] = match;
        }

        return {
          isSwap: true,
          fromToken: fromToken ? fromToken.toUpperCase() : null,
          toToken: toToken ? toToken.toUpperCase() : null,
          amount: amount ? parseFloat(amount) : null,
          rawMessage: message,
          confidence: 0.9
        };
      }
    }

    // Check for general swap keywords without specific format
    const swapKeywords = ['swap', 'exchange', 'convert', 'trade', 'saucerswap'];
    const hasSwapKeyword = swapKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasSwapKeyword) {
      // Look for token mentions
      const tokenPattern = /\b(hbar|usdc|usdt|sauce|whbar|dovu|grelf|btc|eth)\b/gi;
      const tokens = message.match(tokenPattern);
      
      if (tokens && tokens.length >= 2) {
        return {
          isSwap: true,
          fromToken: tokens[0].toUpperCase(),
          toToken: tokens[1].toUpperCase(),
          amount: null,
          rawMessage: message,
          confidence: 0.7
        };
      } else if (tokens && tokens.length === 1) {
        return {
          isSwap: true,
          fromToken: tokens[0].toUpperCase(),
          toToken: null,
          amount: null,
          rawMessage: message,
          confidence: 0.6
        };
      }
    }

    return {
      isSwap: false
    };
  }

  /**
   * Extract keywords from message
   * @param {string} message - User's message
   * @returns {Array} Array of keywords
   */
  extractKeywords(message) {
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Common crypto and DeFi terms including Hedera ecosystem
    const cryptoTerms = [
      'btc', 'eth', 'usdc', 'usdt', 'sei', 'bitcoin', 'ethereum',
      'hbar', 'sauce', 'whbar', 'dovu', 'grelf', 'hedera',
      'swap', 'stake', 'lend', 'defi', 'dex', 'pool', 'farm',
      'yield', 'apr', 'apy', 'token', 'coin', 'price', 'chart',
      'saucerswap', 'exchange', 'convert', 'trade'
    ];
    
    return words.filter(word => cryptoTerms.includes(word) || word.length > 4).slice(0, 10);
  }

  /**
   * Get classification statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      service: 'MessageClassificationService',
      version: '1.0.0',
      supportedTypes: ['strategy', 'actions', 'information', 'feedbacks'],
      supportedActionSubtypes: [
        'transfer', 'swap', 'stake', 'lend', 'borrow', 'bridge',
        'buy', 'sell', 'mint', 'burn', 'other'
      ],
      llmEnabled: !!together,
      fallbackEnabled: true
    };
  }
}

// Export singleton instance
const messageClassificationService = new MessageClassificationService();
module.exports = messageClassificationService;