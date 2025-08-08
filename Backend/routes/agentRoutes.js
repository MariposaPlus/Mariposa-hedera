const express = require('express');
const { body, param } = require('express-validator');
const {
  generateStrategy,
  modifyAgentStrategy,
  approveAgent,
  createSimpleAgent,
  createAgentWithHedera
} = require('../controllers/agentController');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneratedStrategy:
 *       type: object
 *       properties:
 *         agentName:
 *           type: string
 *           description: Human name with expertise (e.g., Marcus DCA Expert)
 *           example: "Marcus DCA Expert"
 *         agentUuid:
 *           type: string
 *           description: Unique identifier for the agent
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description:
 *           type: string
 *           description: Strategy description
 *           example: "Expert DCA strategy for long-term Bitcoin accumulation"
 *         primaryStrategy:
 *           type: string
 *           enum: [DCA, momentum_trading, swing_trading, hodl, arbitrage, scalping, memecoin, yield_farming, spot_trading, futures_trading, custom]
 *           description: Primary trading strategy
 *           example: "DCA"
 *         riskTolerance:
 *           type: string
 *           enum: [conservative, moderate, aggressive]
 *           description: Risk tolerance level
 *           example: "moderate"
 *         defaultBudget:
 *           type: number
 *           description: Default budget amount in USD
 *           example: 1000
 *         frequency:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           description: Investment frequency
 *           example: "monthly"
 *         portfolioAllocation:
 *           type: object
 *           description: Token allocation with percentages and reasoning
 *         maxPositionSize:
 *           type: number
 *           description: Maximum position size in USD
 *           example: 2000
 *         stopLossPercentage:
 *           type: number
 *           description: Stop loss percentage
 *           example: 10
 *         takeProfitPercentage:
 *           type: number
 *           description: Take profit percentage
 *           example: 25
 *         portfolioManagementPlan:
 *           type: object
 *           description: Comprehensive portfolio management plan
 *         marketInsights:
 *           type: string
 *           description: Current market analysis
 *         riskAssessment:
 *           type: string
 *           description: Risk analysis for the strategy
 *     ApprovalStatus:
 *       type: object
 *       properties:
 *         isApproved:
 *           type: boolean
 *           description: Whether the agent is approved
 *           example: true
 *         canBeginWork:
 *           type: boolean
 *           description: Whether the agent can begin work
 *           example: true
 *         requiresApproval:
 *           type: boolean
 *           description: Whether the agent requires approval
 *           example: false

/**
 * @swagger
 * /api/agents/generate-strategy:
 *   post:
 *     summary: Generate trading strategy and create agent with wallet
 *     description: Generate a comprehensive trading strategy using AI, create agent, and wallet. Agent will be pending approval.
 *     tags: [Agents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - userId
 *             properties:
 *               message:
 *                 type: string
 *                 description: User's trading intent and requirements
 *                 example: "I want to invest $1000 in a DCA strategy for Bitcoin and Ethereum"
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "user123"
 *               sessionId:
 *                 type: string
 *                 description: Session ID for memory context (optional, will be auto-generated if not provided)
 *                 example: "127.0.0.1_Mozilla_5.0_Chrome_120.0"
 *     responses:
 *       201:
 *         description: Agent created successfully with strategy and wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: object
 *                       description: Created agent object
 *                     strategy:
 *                       $ref: '#/components/schemas/GeneratedStrategy'
 *                     strategyId:
 *                       type: string
 *                       description: Database ID of the saved strategy
 *                       example: "60d5ecb54b5d4c001f3a8b25"
 *                     agentId:
 *                       type: string
 *                       description: Database ID of the created agent
 *                       example: "60d5ecb54b5d4c001f3a8b26"
 *                     agentUuid:
 *                       type: string
 *                       description: Unique identifier for the agent
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     userId:
 *                       type: string
 *                       example: "user123"
 *                     sessionId:
 *                       type: string
 *                       example: "127.0.0.1_Mozilla_5.0_Chrome_120.0"
 *                     memoryId:
 *                       type: string
 *                       description: Memory record ID
 *                       example: "60d5ecb54b5d4c001f3a8b27"
 *                     walletInfo:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           description: Wallet address
 *                         walletId:
 *                           type: string
 *                           description: Wallet ID
 *                         network:
 *                           type: string
 *                           example: "sei"
 *                         status:
 *                           type: string
 *                           example: "created"
 *                     approvalStatus:
 *                       $ref: '#/components/schemas/ApprovalStatus'
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     message:
 *                       type: string
 *                       example: "Agent Marcus DCA Expert created successfully with wallet and strategy. Agent requires approval before it can begin work."
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error or AI service unavailable
 */

/**
 * @swagger
 * /api/agents/simple:
 *   post:
 *     summary: Create a simple agent with Hedera wallet
 *     description: |
 *       Creates a simple AI agent with minimal configuration - just name, user ID, and initial wallet balance.
 *       Perfect for quick agent creation without complex strategy/prompt configurations.
 *       
 *       **🎯 Simple & Fast:**
 *       - Only requires name, userId, and optional initialBalance
 *       - Automatically creates Hedera wallet with specified balance
 *       - Sets sensible defaults for all other fields
 *       - No complex strategy or prompt configuration needed
 *       
 *       **🔑 Wallet Features:**
 *       - Generates new private/public key pair
 *       - Creates new Hedera account with specified initial HBAR balance
 *       - Encrypts and securely stores private key
 *       - Associates wallet with user ID
 *     tags: [Agents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - userId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Agent name (must be unique per user)
 *                 example: "My Simple Bot"
 *                 minLength: 2
 *                 maxLength: 100
 *               userId:
 *                 type: string
 *                 description: User ID that will own this agent
 *                 example: "user_123"
 *               initialBalance:
 *                 type: number
 *                 description: Initial HBAR balance for the wallet
 *                 default: 10
 *                 minimum: 1
 *                 example: 25
 *           examples:
 *             quickAgent:
 *               summary: Quick Agent Creation
 *               description: Minimal setup with default balance
 *               value:
 *                 name: "Quick Bot"
 *                 userId: "user_123"
 *             customBalance:
 *               summary: Custom Initial Balance
 *               description: Agent with custom wallet balance
 *               value:
 *                 name: "Rich Bot"
 *                 userId: "user_456"
 *                 initialBalance: 100
 *     responses:
 *       201:
 *         description: Simple agent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60d5ecb54b5d4c001f3a8b25"
 *                         name:
 *                           type: string
 *                           example: "Quick Bot"
 *                         agentUuid:
 *                           type: string
 *                           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                         userId:
 *                           type: string
 *                           example: "user_123"
 *                         agentType:
 *                           type: string
 *                           example: "general"
 *                         role:
 *                           type: string
 *                           example: "Simple Agent"
 *                         hederaAccountId:
 *                           type: string
 *                           example: "0.0.12345"
 *                         hederaPublicKey:
 *                           type: string
 *                           example: "302a300506032b6570032100..."
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                           example: true
 *                         accountId:
 *                           type: string
 *                           example: "0.0.12345"
 *                         publicKey:
 *                           type: string
 *                           example: "302a300506032b6570032100..."
 *                         network:
 *                           type: string
 *                           example: "testnet"
 *                         initialBalance:
 *                           type: number
 *                           example: 25
 *                         transactionId:
 *                           type: string
 *                           example: "0.0.123@1234567890.123456789"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         creationTime:
 *                           type: string
 *                           example: "1.8s"
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                 message:
 *                   type: string
 *                   example: "Simple agent with Hedera wallet created successfully"
 *             examples:
 *               successfulCreation:
 *                 summary: Successful Creation
 *                 value:
 *                   success: true
 *                   data:
 *                     agent:
 *                       _id: "60d5ecb54b5d4c001f3a8b25"
 *                       name: "Quick Bot"
 *                       agentUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                       userId: "user_123"
 *                       agentType: "general"
 *                       role: "Simple Agent"
 *                       hederaAccountId: "0.0.12345"
 *                       hederaPublicKey: "302a300506032b6570032100..."
 *                       isActive: true
 *                       createdAt: "2025-01-15T10:30:00Z"
 *                     wallet:
 *                       enabled: true
 *                       accountId: "0.0.12345"
 *                       publicKey: "302a300506032b6570032100..."
 *                       network: "testnet"
 *                       initialBalance: 25
 *                       transactionId: "0.0.123@1234567890.123456789"
 *                     metadata:
 *                       creationTime: "1.8s"
 *                       timestamp: "2025-01-15T10:30:00Z"
 *                   message: "Simple agent with Hedera wallet created successfully"
 *       400:
 *         description: Validation error or agent name conflict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Agent with this name already exists for this user"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to create simple agent"
 */
router.post('/simple', [
  body('name')
    .notEmpty()
    .withMessage('Agent name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Agent name must be between 2 and 100 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('initialBalance')
    .optional()
    .isNumeric()
    .withMessage('Initial balance must be a number')
    .custom(value => {
      if (value && value < 1) {
        throw new Error('Initial balance must be at least 1 HBAR');
      }
      return true;
    })
], createSimpleAgent);

/**
 * @swagger
 * /api/agents/hedera:
 *   post:
 *     summary: Create a new specialized agent with dedicated Hedera wallet
 *     description: |
 *       Creates a new AI agent with a dedicated Hedera testnet wallet and specialized configuration based on agent type:
 *       
 *       **🤖 Agent Types:**
 *       - **Strategy**: Trading and investment strategy agents (DCA, momentum, etc.)
 *       - **Actions**: Transaction execution agents (transfer, swap, stake, etc.)
 *       - **Information**: Market data and analysis agents (prices, analytics, etc.)
 *       - **Feedback**: Advisory and recommendation agents (performance analysis, etc.)
 *       - **General**: Multi-purpose agents for general blockchain assistance
 *       
 *       **🔑 Hedera Wallet Features:**
 *       - Generates new private/public key pair
 *       - Creates new Hedera account with initial HBAR balance
 *       - Encrypts and securely stores private key
 *       - Associates wallet with specific user ID
 *       
 *       **⚡ Type-Specific Configuration:**
 *       - Each agent type has optimized default settings
 *       - Custom prompts tailored to agent purpose
 *       - Relevant capabilities and limitations
 *       - User can override defaults as needed
 *       
 *       **🛡️ Security Features:**
 *       - Private keys encrypted before storage
 *       - Agent-specific credential isolation
 *       - Type-based permission controls
 *       - Graceful fallback if wallet creation fails
 *     tags: [Agents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - userId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Agent name (must be unique per user)
 *                 example: "Bitcoin DCA Bot"
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 description: Agent description (auto-generated if not provided)
 *                 example: "Specialized DCA agent for Bitcoin accumulation on Hedera"
 *                 maxLength: 500
 *               userId:
 *                 type: string
 *                 description: User ID that will own this agent
 *                 example: "user_123abc"
 *               agentType:
 *                 type: string
 *                 enum: [strategy, actions, information, feedback, general]
 *                 description: Type/purpose of the agent
 *                 default: general
 *                 example: "actions"
 *               primaryStrategy:
 *                 type: string
 *                 enum: [DCA, momentum_trading, swing_trading, hodl, arbitrage, scalping, memecoin, yield_farming, spot_trading, futures_trading, custom]
 *                 description: Primary trading strategy (only for strategy agents)
 *                 example: "DCA"
 *               configuration:
 *                 type: object
 *                 description: Agent configuration and behavior settings (varies by agent type)
 *                 properties:
 *                   avatarName:
 *                     type: string
 *                     description: Display name for the agent avatar
 *                     example: "Trading Bot"
 *                   role:
 *                     type: string
 *                     description: Agent's role/specialization (auto-generated based on type if not provided)
 *                     example: "Action Execution Agent"
 *                   customPrompt:
 *                     type: string
 *                     description: Custom system prompt for the agent (auto-generated based on type if not provided)
 *                     example: "I am specialized in executing blockchain transactions safely"
 *                   defaultBudget:
 *                     type: number
 *                     description: Default budget in USD (strategy agents only)
 *                     example: 1000
 *                   riskTolerance:
 *                     type: string
 *                     enum: [conservative, moderate, aggressive]
 *                     description: Risk tolerance (strategy agents only)
 *                     example: "moderate"
 *                   supportedActions:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Supported actions (action agents only)
 *                     example: ["transfer", "swap", "stake"]
 *                   executionMode:
 *                     type: string
 *                     enum: [guided, autonomous]
 *                     description: Execution mode (action agents only)
 *                     example: "guided"
 *                   maxTransactionValue:
 *                     type: number
 *                     description: Maximum transaction value in HBAR (action agents only)
 *                     example: 1000
 *                   informationTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Types of information provided (information agents only)
 *                     example: ["market_data", "token_analysis"]
 *                   capabilities:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: General capabilities (general agents only)
 *                     example: ["basic_actions", "information_lookup"]
 *               hederaOptions:
 *                 type: object
 *                 description: Hedera wallet creation options
 *                 properties:
 *                   useOperatorCredentials:
 *                     type: boolean
 *                     description: Use operator credentials instead of creating new account
 *                     default: false
 *                   createNewAccount:
 *                     type: boolean
 *                     description: Create new Hedera account (requires funding)
 *                     default: true
 *                   initialBalance:
 *                     type: number
 *                     description: Initial HBAR balance for new account
 *                     default: 10
 *                     example: 10
 *                   encryptPrivateKey:
 *                     type: boolean
 *                     description: Encrypt private key before storage
 *                     default: true
 *                   strictMode:
 *                     type: boolean
 *                     description: Delete agent if wallet creation fails
 *                     default: false
 *           examples:
 *             strategyAgent:
 *               summary: Trading Strategy Agent
 *               description: Agent specialized in trading strategies
 *               value:
 *                 name: "Bitcoin DCA Agent"
 *                 userId: "user_123"
 *                 agentType: "strategy"
 *                 primaryStrategy: "DCA"
 *                 configuration:
 *                   defaultBudget: 1000
 *                   riskTolerance: "moderate"
 *                 hederaOptions:
 *                   initialBalance: 20
 *             actionAgent:
 *               summary: Action Execution Agent
 *               description: Agent specialized in executing blockchain actions
 *               value:
 *                 name: "Transaction Executor"
 *                 userId: "user_456"
 *                 agentType: "actions"
 *                 configuration:
 *                   supportedActions: ["transfer", "swap", "stake"]
 *                   executionMode: "guided"
 *                   maxTransactionValue: 500
 *                   confirmationRequired: true
 *                 hederaOptions:
 *                   initialBalance: 30
 *             informationAgent:
 *               summary: Information & Analysis Agent
 *               description: Agent specialized in providing market data and analysis
 *               value:
 *                 name: "Market Analyst"
 *                 userId: "user_789"
 *                 agentType: "information"
 *                 configuration:
 *                   informationTypes: ["market_data", "token_analysis", "defi_protocols"]
 *                   updateFrequency: "real_time"
 *                   dataSource: "multiple"
 *                 hederaOptions:
 *                   initialBalance: 10
 *             feedbackAgent:
 *               summary: Feedback & Advisory Agent
 *               description: Agent specialized in providing feedback and recommendations
 *               value:
 *                 name: "Portfolio Advisor"
 *                 userId: "user_101"
 *                 agentType: "feedback"
 *                 configuration:
 *                   feedbackTypes: ["performance_analysis", "strategy_recommendations"]
 *                   analysisDepth: "comprehensive"
 *                 hederaOptions:
 *                   initialBalance: 15
 *             generalAgent:
 *               summary: General Purpose Agent
 *               description: Agent for general blockchain assistance
 *               value:
 *                 name: "Hedera Assistant"
 *                 userId: "user_202"
 *                 agentType: "general"
 *                 configuration:
 *                   capabilities: ["basic_actions", "information_lookup", "guidance"]
 *                   interactionMode: "conversational"
 *                 hederaOptions:
 *                   initialBalance: 10
 *     responses:
 *       201:
 *         description: Agent with Hedera wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: object
 *                       description: Created agent (private key excluded)
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60d5ecb54b5d4c001f3a8b25"
 *                         name:
 *                           type: string
 *                           example: "Bitcoin DCA Agent"
 *                         agentUuid:
 *                           type: string
 *                           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                         userId:
 *                           type: string
 *                           example: "user_123"
 *                         hederaAccountId:
 *                           type: string
 *                           example: "0.0.12345"
 *                         hederaPublicKey:
 *                           type: string
 *                           example: "302a300506032b6570032100..."
 *                     hedera:
 *                       type: object
 *                       description: Hedera wallet information
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                           example: true
 *                         accountId:
 *                           type: string
 *                           example: "0.0.12345"
 *                         publicKey:
 *                           type: string
 *                           example: "302a300506032b6570032100..."
 *                         network:
 *                           type: string
 *                           example: "testnet"
 *                         initialBalance:
 *                           type: number
 *                           example: 10
 *                         transactionId:
 *                           type: string
 *                           example: "0.0.123@1234567890.123456789"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         creationTime:
 *                           type: string
 *                           example: "2.5s"
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                 message:
 *                   type: string
 *                   example: "Agent with Hedera wallet created successfully"
 *             examples:
 *               strategyAgentCreation:
 *                 summary: Strategy Agent Creation
 *                 value:
 *                   success: true
 *                   data:
 *                     agent:
 *                       _id: "60d5ecb54b5d4c001f3a8b25"
 *                       name: "Bitcoin DCA Agent"
 *                       agentUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                       userId: "user_123"
 *                       agentType: "strategy"
 *                       primaryStrategy: "DCA"
 *                       role: "Trading Strategy Agent"
 *                       hederaAccountId: "0.0.12345"
 *                       hederaPublicKey: "302a300506032b6570032100..."
 *                       isActive: true
 *                     hedera:
 *                       enabled: true
 *                       accountId: "0.0.12345"
 *                       publicKey: "302a300506032b6570032100..."
 *                       network: "testnet"
 *                       initialBalance: 20
 *                       transactionId: "0.0.123@1234567890.123456789"
 *                     metadata:
 *                       creationTime: "2.5s"
 *                       timestamp: "2025-01-15T10:30:00Z"
 *                   message: "Agent with Hedera wallet created successfully"
 *               actionAgentCreation:
 *                 summary: Action Agent Creation
 *                 value:
 *                   success: true
 *                   data:
 *                     agent:
 *                       _id: "60d5ecb54b5d4c001f3a8b26"
 *                       name: "Transaction Executor"
 *                       agentUuid: "b2c3d4e5-f6g7-8901-bcde-fg2345678901"
 *                       userId: "user_456"
 *                       agentType: "actions"
 *                       role: "Action Execution Agent"
 *                       hederaAccountId: "0.0.12346"
 *                       hederaPublicKey: "302a300506032b6570032101..."
 *                       isActive: true
 *                     hedera:
 *                       enabled: true
 *                       accountId: "0.0.12346"
 *                       publicKey: "302a300506032b6570032101..."
 *                       network: "testnet"
 *                       initialBalance: 30
 *                       transactionId: "0.0.124@1234567890.123456790"
 *                     metadata:
 *                       creationTime: "2.1s"
 *                       timestamp: "2025-01-15T10:35:00Z"
 *                   message: "Agent with Hedera wallet created successfully"
 *               gracefulFallback:
 *                 summary: Graceful Fallback (Wallet Creation Failed)
 *                 value:
 *                   success: true
 *                   data:
 *                     agent:
 *                       _id: "60d5ecb54b5d4c001f3a8b25"
 *                       name: "Bitcoin DCA Agent"
 *                       userId: "user_123"
 *                       isActive: true
 *                     hedera:
 *                       enabled: false
 *                       error: "Insufficient operator balance for account creation"
 *                   message: "Agent created, but Hedera wallet creation failed"
 *       400:
 *         description: Validation error or agent name conflict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Agent with this name already exists for this user"
 *                 errors:
 *                   type: array
 *                   description: Validation errors (if applicable)
 *       500:
 *         description: Server error or wallet creation failure in strict mode
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to create agent with Hedera wallet"
 *                 error:
 *                   type: string
 *                   example: "Insufficient operator balance for account creation"
 *                 agentDeleted:
 *                   type: boolean
 *                   description: True if agent was deleted due to wallet creation failure in strict mode
 *                   example: true
 */
router.post('/hedera', [
  body('name')
    .notEmpty()
    .withMessage('Agent name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Agent name must be between 2 and 100 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('agentType')
    .optional()
    .isIn(['strategy', 'actions', 'information', 'feedback', 'general'])
    .withMessage('Agent type must be one of: strategy, actions, information, feedback, general'),
  body('primaryStrategy')
    .optional()
    .isIn(['DCA', 'momentum_trading', 'swing_trading', 'hodl', 'arbitrage', 'scalping', 'memecoin', 'yield_farming', 'spot_trading', 'futures_trading', 'custom'])
    .withMessage('Invalid primary strategy'),
  body('configuration.defaultBudget')
    .optional()
    .isNumeric()
    .withMessage('Default budget must be a number'),
  body('configuration.riskTolerance')
    .optional()
    .isIn(['conservative', 'moderate', 'aggressive'])
    .withMessage('Risk tolerance must be conservative, moderate, or aggressive'),
  body('hederaOptions.initialBalance')
    .optional()
    .isNumeric()
    .withMessage('Initial balance must be a number'),
  body('hederaOptions.useOperatorCredentials')
    .optional()
    .isBoolean()
    .withMessage('useOperatorCredentials must be a boolean'),
  body('hederaOptions.createNewAccount')
    .optional()
    .isBoolean()
    .withMessage('createNewAccount must be a boolean'),
  body('hederaOptions.encryptPrivateKey')
    .optional()
    .isBoolean()
    .withMessage('encryptPrivateKey must be a boolean'),
  body('hederaOptions.strictMode')
    .optional()
    .isBoolean()
    .withMessage('strictMode must be a boolean')
], createAgentWithHedera);

router.post('/generate-strategy', [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
], generateStrategy);

/**
 * @swagger
 * /api/agents/{id}/modify-strategy:
 *   put:
 *     summary: Modify agent strategy
 *     description: Modify an existing agent's strategy using AI with memory context and reset approval status
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *         example: "60d5ecb54b5d4c001f3a8b25"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - userId
 *             properties:
 *               message:
 *                 type: string
 *                 description: New strategy requirements
 *                 example: "I want to change to a more aggressive momentum trading strategy"
 *               userId:
 *                 type: string
 *                 description: User ID (must match agent owner)
 *                 example: "user123"
 *               sessionId:
 *                 type: string
 *                 description: Session ID for memory context (optional, will be auto-generated if not provided)
 *                 example: "127.0.0.1_Mozilla_5.0_Chrome_120.0"
 *               useMemory:
 *                 type: boolean
 *                 description: Whether to use memory context from previous interactions
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Agent strategy modified successfully (or new agent created from memory)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: object
 *                       description: Updated or newly created agent
 *                     strategy:
 *                       $ref: '#/components/schemas/GeneratedStrategy'
 *                     strategyId:
 *                       type: string
 *                       description: Database ID of the saved strategy
 *                       example: "60d5ecb54b5d4c001f3a8b25"
 *                     agentId:
 *                       type: string
 *                       description: Database ID of the agent
 *                       example: "60d5ecb54b5d4c001f3a8b26"
 *                     agentUuid:
 *                       type: string
 *                       description: Unique identifier for the agent
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     userId:
 *                       type: string
 *                       example: "user123"
 *                     sessionId:
 *                       type: string
 *                       example: "127.0.0.1_Mozilla_5.0_Chrome_120.0"
 *                     memoryId:
 *                       type: string
 *                       description: Memory record ID
 *                       example: "60d5ecb54b5d4c001f3a8b27"
 *                     walletInfo:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           description: Wallet address
 *                         walletId:
 *                           type: string
 *                           description: Wallet ID
 *                         network:
 *                           type: string
 *                           example: "sei"
 *                         status:
 *                           type: string
 *                           example: "created"
 *                     approvalStatus:
 *                       $ref: '#/components/schemas/ApprovalStatus'
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     message:
 *                       type: string
 *                       example: "Agent Marcus DCA Expert strategy modified successfully. Agent requires re-approval before it can begin work."
 *       400:
 *         description: Validation error
 *       403:
 *         description: Unauthorized - Agent belongs to different user
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.put('/:id/modify-strategy', [
  param('id').custom((value) => {
    // Accept both MongoDB ObjectId and UUID formats
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(value);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if (!isMongoId && !isUuid) {
      throw new Error('Invalid agent ID format');
    }
    return true;
  }).withMessage('Invalid agent ID'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
], modifyAgentStrategy);

/**
 * @swagger
 * /api/agents/{id}/approve:
 *   put:
 *     summary: Approve agent to begin work
 *     description: Approve or disapprove an agent to begin trading operations
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *         example: "60d5ecb54b5d4c001f3a8b25"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (must match agent owner)
 *                 example: "user123"
 *               isApproved:
 *                 type: boolean
 *                 description: Approval status
 *                 default: true
 *                 example: true
 *     responses:
 *       200:
 *         description: Agent approval status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: object
 *                       description: Updated agent with approval status
 *                     approvalStatus:
 *                       $ref: '#/components/schemas/ApprovalStatus'
 *                     message:
 *                       type: string
 *                       example: "Agent approved successfully. Agent can now begin work."
 *       400:
 *         description: Validation error
 *       403:
 *         description: Unauthorized - Agent belongs to different user
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.put('/:id/approve', [
  param('id').isMongoId().withMessage('Invalid agent ID'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('isApproved')
    .optional()
    .isBoolean()
    .withMessage('isApproved must be boolean')
], approveAgent);

module.exports = router; 