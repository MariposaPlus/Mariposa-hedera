const Together = require('together-ai').default;
const ContactsTokensService = require('./contactsTokensService');

class EnhancedIntentService {
  constructor() {
    this.contactsTokensService = new ContactsTokensService();
    
    // Initialize Together AI
    try {
      this.together = new Together({
        apiKey: process.env.TOGETHER_API_KEY || 'dummy-key'
      });
    } catch (error) {
      console.warn('Together AI not initialized. Please set TOGETHER_API_KEY environment variable.');
      this.together = null;
    }
  }

  /**
   * Enhanced message parsing that extracts intents and validates arguments
   */
  async parseMessageWithValidation(message, userId = null) {
    try {
      console.log('🔍 Enhanced intent parsing for message:', message);

      // Step 1: Classify the message type
      const classification = await this.classifyMessage(message);
      
      // Step 2: Extract arguments based on classification
      const extraction = await this.extractArguments(message, classification);
      
      // Step 3: Validate arguments and resolve contacts/tokens
      const validation = this.validateAndResolveArguments(extraction);
      
      // Step 4: Generate interactive UI data for missing arguments
      const interactiveData = this.generateInteractiveData(validation.missing, classification.type);

      const result = {
        classification,
        extraction,
        validation,
        interactiveData,
        timestamp: new Date().toISOString(),
        userId
      };

      console.log('✅ Enhanced intent parsing complete:', result);
      return result;

    } catch (error) {
      console.error('❌ Enhanced intent parsing failed:', error);
      return {
        classification: { type: 'information', confidence: 0.1 },
        extraction: { args: {} },
        validation: { isValid: false, missing: [], resolved: {} },
        interactiveData: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        userId
      };
    }
  }

  /**
   * Classify message type using LLM
   */
  async classifyMessage(message) {
    if (!this.together) {
      return this.fallbackClassification(message);
    }

    try {
      const systemPrompt = `You are a message classifier for a crypto trading platform. Classify user messages into one of these categories:

1. **actions**: User wants to perform specific blockchain actions
   - transfer: Send tokens/HBAR to someone ("send 100 HBAR to Samir", "transfer USDC to Alice")
   - swap: Exchange one token for another ("swap HBAR for USDC", "exchange my SAUCE for USDT") 
   - stake: Stake tokens for rewards ("stake my HBAR", "delegate to validator")
   - createAgent: Create a new AI agent ("create an agent", "make a trading bot")
   - deployContract: Deploy a smart contract ("deploy my contract", "create a token")
   - associateToken: Associate token with account ("associate token 0.0.123456")
   - createTopic: Create a topic ("create topic for alerts", "make a new topic")
   - sendMessage: Send message to topic ("send message to topic", "publish to topic")

2. **strategy**: User wants to create trading strategies or has investment goals
3. **information**: User asking for data, analysis, or educational content  
4. **feedbacks**: User wants feedback on completed actions

For actions, also identify the specific action subtype.

Respond with JSON:
{
  "type": "actions|strategy|information|feedbacks",
  "actionSubtype": "transfer|swap|stake|createAgent|deployContract|associateToken|createTopic|sendMessage|other",
  "confidence": 0.1-1.0,
  "reasoning": "brief explanation"
}`;

      const response = await this.together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classify: "${message}"` }
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      console.error('Classification error:', error);
      return this.fallbackClassification(message);
    }
  }

  /**
   * Extract arguments from message using LLM
   */
  async extractArguments(message, classification) {
    if (!this.together || classification.type !== 'actions') {
      return { args: {} };
    }

    try {
      const actionType = classification.actionSubtype || 'other';
      const systemPrompt = this.buildExtractionPrompt(actionType);

      const response = await this.together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract arguments from: "${message}"` }
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const extracted = JSON.parse(response.choices[0].message.content);
      console.log(`🤖 LLM extracted arguments for ${actionType}:`, JSON.stringify(extracted.args, null, 2));
      return {
        actionType,
        args: extracted.args || {},
        originalMessage: message
      };

    } catch (error) {
      console.error('Argument extraction error:', error);
      return { 
        actionType: classification.actionSubtype || 'other',
        args: {},
        originalMessage: message
      };
    }
  }

  /**
   * Build extraction prompt based on action type
   */
  buildExtractionPrompt(actionType) {
    const extractionRules = {
      transfer: {
        args: ['recipient', 'amount', 'tokenId'],
        examples: [
          'send 100 HBAR to Samir → {"recipient": "Samir", "amount": 100, "tokenId": "HBAR"}',
          'transfer 50 USDC to 0.0.1234 → {"recipient": "0.0.1234", "amount": 50, "tokenId": "USDC"}'
        ]
      },
      swap: {
        args: ['fromToken', 'toToken', 'amount', 'swapType'],
        examples: [
          'swap 100 HBAR for USDC → {"fromToken": "HBAR", "toToken": "USDC", "amount": 100, "swapType": "exactInput"}',
          'exchange SAUCE to USDT → {"fromToken": "SAUCE", "toToken": "USDT", "swapType": "exactInput"}',
          'swap 1 hbar to sauce → {"fromToken": "HBAR", "toToken": "SAUCE", "amount": 1, "swapType": "exactInput"}',
          'trade 50 usdc for sauce → {"fromToken": "USDC", "toToken": "SAUCE", "amount": 50, "swapType": "exactInput"}'
        ]
      },
      stake: {
        args: ['amount', 'tokenId', 'validator'],
        examples: [
          'stake 1000 HBAR → {"amount": 1000, "tokenId": "HBAR"}',
          'delegate to validator 0.0.800 → {"validator": "0.0.800"}'
        ]
      },
      createAgent: {
        args: ['name', 'description', 'strategy'],
        examples: [
          'create trading agent called "DCA Bot" → {"name": "DCA Bot", "description": "trading agent"}',
          'make agent for arbitrage → {"description": "arbitrage", "strategy": "arbitrage"}'
        ]
      },
      associateToken: {
        args: ['tokenId'],
        examples: [
          'associate token 0.0.123456 → {"tokenId": "0.0.123456"}',
          'associate USDC → {"tokenId": "USDC"}'
        ]
      },
      createTopic: {
        args: ['memo', 'submitKey'],
        examples: [
          'create topic for alerts → {"memo": "alerts"}',
          'make new topic "price updates" → {"memo": "price updates"}'
        ]
      },
      sendMessage: {
        args: ['topicId', 'message'],
        examples: [
          'send "hello" to topic 0.0.456 → {"topicId": "0.0.456", "message": "hello"}',
          'publish message to topic → {"message": "publish message"}'
        ]
      }
    };

    const rules = extractionRules[actionType] || extractionRules.transfer;
    
    return `Extract arguments for ${actionType} action. Required arguments: ${rules.args.join(', ')}

Rules:
- Extract ONLY the specified arguments
- For names (like "Samir"), keep as-is (don't convert to addresses)
- For token symbols: NORMALIZE to UPPERCASE (hbar → HBAR, sauce → SAUCE, usdc → USDC)
- For amounts, extract as numbers
- For addresses (0.0.xxxxx), keep exact format
- For swapType: default to "exactInput" if not specified
- If argument not found, omit from result
- ALWAYS extract all available tokens and amounts from the message

Examples:
${rules.examples.join('\n')}

Respond with JSON: {"args": {extracted_arguments}}`;
  }

  /**
   * Validate arguments and resolve contacts/tokens
   */
  validateAndResolveArguments(extraction) {
    if (!extraction.args) {
      return { isValid: true, missing: [], resolved: {} };
    }

    const actionType = extraction.actionType;
    return this.contactsTokensService.validateActionArguments(actionType, extraction.args);
  }

  /**
   * Generate interactive UI data for missing arguments
   */
  generateInteractiveData(missingArgs, messageType) {
    if (!missingArgs || missingArgs.length === 0) {
      return null;
    }

    const interactiveComponents = [];

    for (const argName of missingArgs) {
      const component = this.createInteractiveComponent(argName);
      if (component) {
        interactiveComponents.push(component);
      }
    }

    return {
      type: 'argumentRequest',
      message: `I need more information to complete this action. Please provide:`,
      components: interactiveComponents,
      missingArgs
    };
  }

  /**
   * Create interactive component for specific argument
   */
  createInteractiveComponent(argName) {
    const componentMap = {
      recipient: {
        type: 'combobox',
        label: 'Select Recipient',
        placeholder: 'Choose a contact or enter address',
        options: this.contactsTokensService.getComboboxOptions('recipient'),
        allowCustom: true,
        validation: 'address'
      },
      amount: {
        type: 'input',
        inputType: 'number',
        label: 'Amount',
        placeholder: 'Enter amount',
        validation: 'positive_number'
      },
      fromToken: {
        type: 'combobox',
        label: 'From Token',
        placeholder: 'Select token to swap from',
        options: this.contactsTokensService.getComboboxOptions('fromToken', true), // Use testnet swap tokens
        allowCustom: false
      },
      toToken: {
        type: 'combobox', 
        label: 'To Token',
        placeholder: 'Select token to swap to',
        options: this.contactsTokensService.getComboboxOptions('toToken', true), // Use testnet swap tokens
        allowCustom: false
      },
      tokenId: {
        type: 'combobox',
        label: 'Token',
        placeholder: 'Select token',
        options: this.contactsTokensService.getComboboxOptions('tokenId', true), // Use testnet swap tokens
        allowCustom: true,
        validation: 'token_id'
      },
      name: {
        type: 'input',
        inputType: 'text',
        label: 'Name',
        placeholder: 'Enter a name',
        validation: 'required'
      },
      description: {
        type: 'textarea',
        label: 'Description',
        placeholder: 'Enter description',
        rows: 3
      },
      memo: {
        type: 'input',
        inputType: 'text',
        label: 'Memo',
        placeholder: 'Enter memo for topic'
      },
      message: {
        type: 'textarea',
        label: 'Message',
        placeholder: 'Enter message to send',
        rows: 2
      },
      topicId: {
        type: 'input',
        inputType: 'text',
        label: 'Topic ID',
        placeholder: 'Enter topic ID (0.0.xxxxx)',
        validation: 'topic_id'
      }
    };

    return componentMap[argName] || {
      type: 'input',
      inputType: 'text',
      label: argName.charAt(0).toUpperCase() + argName.slice(1),
      placeholder: `Enter ${argName}`
    };
  }

  /**
   * Process user response to interactive components
   */
  async processInteractiveResponse(originalIntent, userResponses) {
    try {
      console.log('🔄 Processing interactive response:', userResponses);

      // Merge user responses with original arguments
      const mergedArgs = {
        ...originalIntent.extraction.args,
        ...userResponses
      };

      // Re-validate with complete arguments
      const validation = this.contactsTokensService.validateActionArguments(
        originalIntent.extraction.actionType,
        mergedArgs
      );

      // If still missing arguments, create new interactive request
      let newInteractiveData = null;
      if (!validation.isValid) {
        newInteractiveData = this.generateInteractiveData(
          validation.missing,
          originalIntent.classification.type
        );
      }

      return {
        ...originalIntent,
        extraction: {
          ...originalIntent.extraction,
          args: mergedArgs
        },
        validation,
        interactiveData: newInteractiveData,
        isComplete: validation.isValid,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Interactive response processing failed:', error);
      throw error;
    }
  }

  /**
   * Fallback classification for when LLM is not available
   */
  fallbackClassification(message) {
    const lowerMessage = message.toLowerCase();
    
    // Action keywords
    const actionKeywords = {
      transfer: ['send', 'transfer', 'pay'],
      swap: ['swap', 'exchange', 'trade', 'convert'],
      stake: ['stake', 'delegate'],
      createAgent: ['create agent', 'make agent', 'new agent'],
      associateToken: ['associate', 'associate token']
    };

    for (const [actionType, keywords] of Object.entries(actionKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return {
          type: 'actions',
          actionSubtype: actionType,
          confidence: 0.7,
          reasoning: `Detected ${actionType} keywords`
        };
      }
    }

    return {
      type: 'information',
      confidence: 0.5,
      reasoning: 'Fallback classification'
    };
  }

  /**
   * Get contacts and tokens for frontend
   */
  getContactsAndTokensData() {
    return {
      contacts: this.contactsTokensService.getContactsByCategory(),
      tokens: this.contactsTokensService.getTokensByCategory(true), // Use testnet swap tokens
      allContacts: this.contactsTokensService.getAllContacts(),
      allTokens: this.contactsTokensService.getAllTokens(true) // Use testnet swap tokens
    };
  }
}

module.exports = EnhancedIntentService;
