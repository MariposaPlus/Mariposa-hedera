const express = require('express');
const { body } = require('express-validator');
const {
  chatWithAgent,
  getCryptoPrices
} = require('../controllers/aiAgentController');
const promptRouterController = require('../controllers/promptRouterController');
const router = express.Router();

/**
 * @swagger
 * components:
 *   tags:
 *     - name: AI Agent
 *       description: AI-powered crypto agent endpoints
 */

/**
 * @swagger
 * /api/agent/chat:
 *   post:
 *     summary: Chat with AI crypto expert
 *     tags: [AI Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: User's message to the AI agent
 *                 example: "I want to start trading on SEI network with moderate risk tolerance"
 *               agentId:
 *                 type: string
 *                 description: Optional agent ID to use for specialized responses
 *                 example: "60d5ecb54b5d4c001f3a8b25"
 *     responses:
 *       200:
 *         description: AI agent response
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
 *                     response:
 *                       type: string
 *                       description: AI agent's response
 *                       example: "Based on your moderate risk tolerance, I recommend starting with a diversified approach..."
 *                     agentId:
 *                       type: string
 *                       example: "60d5ecb54b5d4c001f3a8b25"
 *                     agentName:
 *                       type: string
 *                       example: "My DCA Bot"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         model:
 *                           type: string
 *                           example: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post('/chat', [
  body('message').notEmpty().withMessage('Message is required'),
  body('agentId').optional().isMongoId().withMessage('Invalid agent ID')
], chatWithAgent);

/**
 * @swagger
 * /api/agent/prices:
 *   get:
 *     summary: Get SEI network crypto prices
 *     tags: [AI Agent]
 *     responses:
 *       200:
 *         description: Current crypto prices on SEI network
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
 *                   description: Crypto price data
 *       500:
 *         description: Server error
 */
router.get('/prices', getCryptoPrices);

/**
 * @swagger
 * /api/agent/route:
 *   post:
 *     summary: Two-layer prompt router with Hedera blockchain execution
 *     description: |
 *       Advanced prompt routing system with real blockchain execution capabilities:
 *       
 *       **🔄 Layer 1: Message Classification**
 *       - Analyzes user message to determine type: strategy, actions, information, or feedbacks
 *       - Uses LLM to extract intent, keywords, and action subtypes
 *       - Provides confidence scoring and reasoning
 *       
 *       **⚡ Layer 2: Specialized Processing + Execution**
 *       - Routes to specialized LLMs based on message type
 *       - **Actions**: ✅ Fully implemented with Hedera execution (transfer, swap, stake, lend, etc.)
 *       - **Strategy/Information/Feedbacks**: 🔄 Coming soon
 *       
 *       **🚀 Execution Capabilities:**
 *       - **Transfer**: ✅ Live HBAR & token transfers on Hedera testnet
 *       - **Swap/Stake/Lend**: 📋 Guidance provided, execution coming soon
 *       - **Security**: Agent-specific credentials, encrypted storage, validation
 *       
 *       **💡 Usage Modes:**
 *       - `execute: false` → Get step-by-step guidance only
 *       - `execute: true` → Perform real blockchain transactions
 *     tags: [AI Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: User's message describing their intent
 *                 example: "I want to swap my ETH for BTC on SEI network"
 *               userId:
 *                 type: string
 *                 description: Optional user identifier for tracking
 *                 example: "user123"
 *               agentId:
 *                 type: string
 *                 description: Optional agent identifier for personalization
 *                 example: "agent456"
 *               execute:
 *                 type: boolean
 *                 description: Whether to execute the action (currently supports transfers only)
 *                 default: false
 *                 example: true
 *           examples:
 *             actionGuidanceExample:
 *               summary: Action Request (Guidance Only)
 *               description: Gets step-by-step guidance without executing the action
 *               value:
 *                 message: "Transfer 100 USDC to my friend's wallet"
 *                 userId: "user123"
 *                 agentId: "agent456"
 *                 execute: false
 *             actionExecuteExample:
 *               summary: Action Request (Execute Transfer)
 *               description: Actually executes an HBAR transfer on Hedera testnet
 *               value:
 *                 message: "Transfer 5 HBAR to 0.0.1379"
 *                 userId: "user123"
 *                 agentId: "agent456"
 *                 execute: true
 *             actionComplexExample:
 *               summary: Action Request (Complex Transfer)
 *               description: Transfer with memo and natural language recipient
 *               value:
 *                 message: "Send 2 HBAR to my business partner memo: 'Monthly payment'"
 *                 userId: "user123"
 *                 agentId: "agent456"
 *                 execute: true
 *             strategyExample:
 *               summary: Strategy Request
 *               value:
 *                 message: "How can I make money with memecoins?"
 *                 userId: "user123"
 *             infoExample:
 *               summary: Information Request
 *               value:
 *                 message: "What's the current price of Bitcoin?"
 *                 userId: "user123"
 *     responses:
 *       200:
 *         description: Successfully processed message through both layers
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
 *                     classification:
 *                       type: object
 *                       description: Layer 1 classification results
 *                       properties:
 *                         type:
 *                           type: string
 *                           enum: [strategy, actions, information, feedbacks]
 *                           example: "actions"
 *                         confidence:
 *                           type: number
 *                           example: 0.95
 *                         reasoning:
 *                           type: string
 *                           example: "Detected transfer action with specific amount and recipient"
 *                         keywords:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["transfer", "usdc", "wallet"]
 *                         actionSubtype:
 *                           type: string
 *                           example: "transfer"
 *                     processing:
 *                       type: object
 *                       description: Layer 2 specialized processing results
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: "actions"
 *                         subtype:
 *                           type: string
 *                           example: "transfer"
 *                         result:
 *                           type: object
 *                           description: Detailed processing result with optional execution
 *                           properties:
 *                             actionType:
 *                               type: string
 *                               example: "transfer"
 *                             steps:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["Connect to wallet", "Enter recipient", "Confirm transaction"]
 *                             warnings:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["Always verify recipient address", "Check network fees"]
 *                             riskLevel:
 *                               type: string
 *                               enum: [low, medium, high]
 *                               example: "medium"
 *                             estimatedTime:
 *                               type: string
 *                               example: "2-5 minutes"
 *                             executionStatus:
 *                               type: string
 *                               enum: [guidance_only, completed, failed, not_implemented, fallback_no_execution]
 *                               description: Status of action execution
 *                               example: "completed"
 *                             execution:
 *                               type: object
 *                               description: Execution results (only present when execute=true)
 *                               properties:
 *                                 success:
 *                                   type: boolean
 *                                   example: true
 *                                 transactionDetails:
 *                                   type: object
 *                                   properties:
 *                                     transactionId:
 *                                       type: string
 *                                       example: "0.0.1234@1234567890.123456789"
 *                                     status:
 *                                       type: string
 *                                       example: "SUCCESS"
 *                                     fromAccount:
 *                                       type: string
 *                                       example: "0.0.1378"
 *                                     toAccount:
 *                                       type: string
 *                                       example: "0.0.1379"
 *                                     amount:
 *                                       type: number
 *                                       example: 5
 *                                     currency:
 *                                       type: string
 *                                       example: "HBAR"
 *                                     memo:
 *                                       type: string
 *                                       example: "Transfer from agent"
 *                                     timestamp:
 *                                       type: string
 *                                       format: date-time
 *                                 executionSummary:
 *                                   type: object
 *                                   properties:
 *                                     action:
 *                                       type: string
 *                                       example: "transfer"
 *                                     amount:
 *                                       type: number
 *                                       example: 5
 *                                     currency:
 *                                       type: string
 *                                       example: "HBAR"
 *                                     from:
 *                                       type: string
 *                                       example: "0.0.1378"
 *                                     to:
 *                                       type: string
 *                                       example: "0.0.1379"
 *                                     transactionId:
 *                                       type: string
 *                                       example: "0.0.1234@1234567890.123456789"
 *                                     status:
 *                                       type: string
 *                                       example: "SUCCESS"
 *                                 parsedRequest:
 *                                   type: object
 *                                   description: Details of how the request was parsed
 *                                   properties:
 *                                     originalMessage:
 *                                       type: string
 *                                       example: "Transfer 5 HBAR to 0.0.1379"
 *                                     extractedDetails:
 *                                       type: object
 *                                     resolvedRecipient:
 *                                       type: string
 *                                       example: "0.0.1379"
 *                                     recipientResolved:
 *                                       type: boolean
 *                                       example: false
 *                                 error:
 *                                   type: string
 *                                   description: Error message if execution failed
 *                                   example: "Insufficient balance for transfer"
 *                         status:
 *                           type: string
 *                           enum: [completed, error, placeholder]
 *                           example: "completed"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         originalMessage:
 *                           type: string
 *                         processingTime:
 *                           type: string
 *                           example: "1250ms"
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *             examples:
 *               guidanceOnlyResponse:
 *                 summary: Guidance Only Response
 *                 description: Response when execute=false or not provided
 *                 value:
 *                   success: true
 *                   data:
 *                     classification:
 *                       type: "actions"
 *                       actionSubtype: "transfer"
 *                       confidence: 0.95
 *                       reasoning: "Detected transfer action with specific amount and recipient"
 *                       keywords: ["transfer", "hbar", "friend"]
 *                     processing:
 *                       type: "actions"
 *                       subtype: "transfer"
 *                       status: "completed"
 *                       result:
 *                         actionType: "transfer"
 *                         executionStatus: "guidance_only"
 *                         steps: 
 *                           - "Connect your Hedera wallet"
 *                           - "Enter recipient address: 0.0.1379"
 *                           - "Enter amount: 5 HBAR"
 *                           - "Review transaction details"
 *                           - "Sign and submit transaction"
 *                         warnings:
 *                           - "Always verify recipient address before sending"
 *                           - "Ensure sufficient HBAR balance for transaction + fees"
 *                         riskLevel: "medium"
 *                         estimatedTime: "2-5 minutes"
 *                     metadata:
 *                       originalMessage: "Transfer 5 HBAR to my friend"
 *                       processingTime: "1250ms"
 *                       timestamp: "2025-01-15T10:30:00Z"
 *               executionSuccessResponse:
 *                 summary: Successful Execution Response
 *                 description: Response when execute=true and transfer succeeds
 *                 value:
 *                   success: true
 *                   data:
 *                     classification:
 *                       type: "actions"
 *                       actionSubtype: "transfer"
 *                       confidence: 0.95
 *                       reasoning: "Detected transfer action with specific amount and recipient"
 *                       keywords: ["transfer", "hbar"]
 *                     processing:
 *                       type: "actions"
 *                       subtype: "transfer"
 *                       status: "completed"
 *                       result:
 *                         actionType: "transfer"
 *                         executionStatus: "completed"
 *                         steps:
 *                           - "Connect your Hedera wallet"
 *                           - "Enter recipient address: 0.0.1379"
 *                           - "Enter amount: 5 HBAR"
 *                           - "Review transaction details"
 *                           - "Sign and submit transaction"
 *                         warnings:
 *                           - "Always verify recipient address before sending"
 *                           - "Ensure sufficient HBAR balance for transaction + fees"
 *                         riskLevel: "medium"
 *                         estimatedTime: "2-5 minutes"
 *                         execution:
 *                           success: true
 *                           transactionDetails:
 *                             transactionId: "0.0.1234@1234567890.123456789"
 *                             status: "SUCCESS"
 *                             fromAccount: "0.0.1378"
 *                             toAccount: "0.0.1379"
 *                             amount: 5
 *                             currency: "HBAR"
 *                             memo: "Transfer from Test Agent"
 *                             timestamp: "2025-01-15T10:30:15Z"
 *                           executionSummary:
 *                             action: "transfer"
 *                             amount: 5
 *                             currency: "HBAR"
 *                             from: "0.0.1378"
 *                             to: "0.0.1379"
 *                             transactionId: "0.0.1234@1234567890.123456789"
 *                             status: "SUCCESS"
 *                           parsedRequest:
 *                             originalMessage: "Transfer 5 HBAR to 0.0.1379"
 *                             extractedDetails:
 *                               amount: 5
 *                               currency: "HBAR"
 *                               recipient: "0.0.1379"
 *                               recipientType: "account_id"
 *                               isHbarTransfer: true
 *                               needsRecipientResolution: false
 *                             resolvedRecipient: "0.0.1379"
 *                             recipientResolved: false
 *                     metadata:
 *                       originalMessage: "Transfer 5 HBAR to 0.0.1379"
 *                       processingTime: "3250ms"
 *                       timestamp: "2025-01-15T10:30:00Z"
 *               executionFailureResponse:
 *                 summary: Failed Execution Response
 *                 description: Response when execute=true but transfer fails
 *                 value:
 *                   success: true
 *                   data:
 *                     classification:
 *                       type: "actions"
 *                       actionSubtype: "transfer"
 *                       confidence: 0.95
 *                     processing:
 *                       type: "actions"
 *                       subtype: "transfer"
 *                       status: "completed"
 *                       result:
 *                         actionType: "transfer"
 *                         executionStatus: "failed"
 *                         execution:
 *                           success: false
 *                           error: "Insufficient balance for transfer"
 *                           status: "failed"
 *                     metadata:
 *                       originalMessage: "Transfer 100000 HBAR to 0.0.1379"
 *                       processingTime: "2150ms"
 *                       timestamp: "2025-01-15T10:30:00Z"
 *       400:
 *         description: Invalid request parameters
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
 *                   example: "Validation error"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: "Message is required"
 *                       param:
 *                         type: string
 *                         example: "message"
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
 *                   example: "Internal server error"
 */
router.post('/route', [
  body('message').notEmpty().withMessage('Message is required')
    .isLength({ min: 3, max: 1000 }).withMessage('Message must be between 3 and 1000 characters'),
  body('userId').optional().isString().withMessage('User ID must be a string'),
  body('agentId').optional().isString().withMessage('Agent ID must be a string'),
  body('execute').optional().isBoolean().withMessage('Execute must be a boolean')
], promptRouterController.routePrompt);

/**
 * @swagger
 * /api/agent/router-info:
 *   get:
 *     summary: Get prompt router information and capabilities
 *     description: Returns detailed information about the two-layer prompt routing system, supported types, and service status
 *     tags: [AI Agent]
 *     responses:
 *       200:
 *         description: Router information retrieved successfully
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
 *                     routerVersion:
 *                       type: string
 *                       example: "1.0.0"
 *                     description:
 *                       type: string
 *                       example: "Two-layer prompt routing system for crypto operations"
 *                     layer1:
 *                       type: object
 *                       description: Message classification layer information
 *                     layer2:
 *                       type: object
 *                       description: Specialized processing layer information
 *                       properties:
 *                         supportedTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["strategy", "actions", "information", "feedbacks"]
 *                         executionCapabilities:
 *                           type: object
 *                           description: Real blockchain execution capabilities
 *                           properties:
 *                             enabled:
 *                               type: boolean
 *                               example: true
 *                             supportedActions:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["transfer"]
 *                             network:
 *                               type: string
 *                               example: "hedera-testnet"
 *                             supportedCurrencies:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["HBAR", "USDC", "USDT", "BTC", "ETH"]
 *                     usage:
 *                       type: object
 *                       description: Usage statistics
 *                       properties:
 *                         totalRequests:
 *                           type: number
 *                           example: 150
 *                         executedActions:
 *                           type: number
 *                           example: 23
 *                         successRate:
 *                           type: number
 *                           example: 0.92
 *       500:
 *         description: Server error
 */
router.get('/router-info', promptRouterController.getRouterInfo);

/**
 * @swagger
 * /api/agent/actions:
 *   get:
 *     summary: Get supported blockchain actions
 *     description: Returns list of all supported blockchain actions that can be processed by the actions LLM
 *     tags: [AI Agent]
 *     responses:
 *       200:
 *         description: Supported actions retrieved successfully
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
 *                     supportedActions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["transfer", "swap", "stake", "lend", "borrow", "bridge", "buy", "sell", "mint", "burn", "other"]
 *                     count:
 *                       type: number
 *                       example: 11
 *                     descriptions:
 *                       type: object
 *                       description: Description of each action type
 *                       example:
 *                         transfer: "Send HBAR or tokens between accounts"
 *                         swap: "Exchange one token for another"
 *                         stake: "Stake tokens to earn rewards"
 *                         lend: "Lend assets to earn interest"
 *                     executionSupport:
 *                       type: object
 *                       description: Which actions support real execution
 *                       properties:
 *                         transfer:
 *                           type: object
 *                           properties:
 *                             supported:
 *                               type: boolean
 *                               example: true
 *                             networks:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["hedera-testnet"]
 *                             currencies:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["HBAR", "USDC", "USDT"]
 *                         swap:
 *                           type: object
 *                           properties:
 *                             supported:
 *                               type: boolean
 *                               example: false
 *                             reason:
 *                               type: string
 *                               example: "Coming soon - DEX integration planned"
 *                         stake:
 *                           type: object
 *                           properties:
 *                             supported:
 *                               type: boolean
 *                               example: false
 *                             reason:
 *                               type: string
 *                               example: "Coming soon - staking protocols integration planned"
 *       500:
 *         description: Server error
 */
router.get('/actions', promptRouterController.getSupportedActions);

module.exports = router; 