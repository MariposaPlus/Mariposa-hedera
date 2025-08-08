const express = require('express');
const { body } = require('express-validator');
const { agentChat } = require('../controllers/agentChatController');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AgentChatRequest:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           description: User's message to the AI agent
 *           example: I want to buy 0.5 ETH
 *     AgentChatResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             sessionId:
 *               type: string
 *               description: Session identifier for conversation continuity
 *             demandClassification:
 *               type: object
 *               properties:
 *                 category:
 *                   type: string
 *                   enum: [action, strategy, information, feedback]
 *                   description: Classified demand type
 *                 reason:
 *                   type: string
 *                   description: Reason for classification
 *             demandType:
 *               type: string
 *               enum: [action, strategy, information, feedback]
 *               description: Type of user demand
 *             marketData:
 *               type: array
 *               description: Current market data (top 5 tokens)
 *               items:
 *                 type: object
 *                 properties:
 *                   symbol:
 *                     type: string
 *                   price:
 *                     type: number
 *                   change24h:
 *                     type: number
 *             timestamp:
 *               type: string
 *               format: date-time
 *             metadata:
 *               type: object
 *               properties:
 *                 model:
 *                   type: string
 *                 processedSteps:
 *                   type: array
 *                   items:
 *                     type: string
 *                 memoryStored:
 *                   type: boolean
 *     ActionResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/AgentChatResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 extractedParameters:
 *                   type: object
 *                   properties:
 *                     actionType:
 *                       type: string
 *                       example: buy
 *                     token:
 *                       type: string
 *                       example: ETH
 *                     amount:
 *                       type: string
 *                       example: 0.5
 *                     urgency:
 *                       type: string
 *                       enum: [immediate, hours, flexible]
 *                 actionPlan:
 *                   type: string
 *                   description: Detailed execution plan for the action
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *     StrategyResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/AgentChatResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 strategyParameters:
 *                   type: object
 *                   properties:
 *                     budget:
 *                       type: string
 *                     riskTolerance:
 *                       type: string
 *                       enum: [conservative, moderate, aggressive]
 *                     timeHorizon:
 *                       type: string
 *                       enum: [short, medium, long]
 *                 strategyPlan:
 *                   type: string
 *                   description: Comprehensive investment strategy
 *                 allocations:
 *                   type: object
 *                   description: Token allocation percentages
 *                   example:
 *                     ETH: "40%"
 *                     BTC: "30%"
 *                     SEI: "20%"
 *                     USDC: "10%"
 *     InformationResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/AgentChatResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 category:
 *                   type: string
 *                   enum: [price, market, technical, news, comparison]
 *                 answer:
 *                   type: string
 *                   description: Detailed answer to the information request
 *                 relatedData:
 *                   type: array
 *                   description: Related market data if applicable
 *     FeedbackResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/AgentChatResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 feedbackContext:
 *                   type: object
 *                   properties:
 *                     tradeDetails:
 *                       type: string
 *                     sentiment:
 *                       type: string
 *                       enum: [positive, negative, neutral]
 *                     wantsAdvice:
 *                       type: boolean
 *                 analysis:
 *                   type: string
 *                   description: Detailed feedback analysis
 *                 supportiveActions:
 *                   type: array
 *                   items:
 *                     type: string
 *   tags:
 *     - name: Agent Chat
 *       description: Intelligent AI agent chat with demand classification and multi-step processing
 */

/**
 * @swagger
 * /api/agent-chat:
 *   post:
 *     summary: Chat with intelligent AI agent
 *     description: |
 *       Send a message to the AI agent that will:
 *       1. **Classify demand type** into one of 4 categories:
 *          - **Action**: Trading actions (buy, sell, transfer, stake, etc.)
 *          - **Strategy**: Investment strategy advice and portfolio recommendations
 *          - **Information**: Market data, explanations, general crypto information
 *          - **Feedback**: Trade evaluation, performance feedback, validation requests
 *       
 *       2. **Process through specialized handlers** based on demand type:
 *          - Each handler uses multiple LLM calls for comprehensive analysis
 *          - Integrates real-time market data for informed responses
 *          - Stores conversation context in memory for continuity
 *       
 *       3. **Generate tailored responses** with:
 *          - Specific action plans for trading requests
 *          - Detailed strategies with allocations for investment advice
 *          - Comprehensive answers for information requests
 *          - Supportive analysis for feedback requests
 *       
 *       **Features:**
 *       - Multi-step LLM processing using TogetherAI
 *       - Real-time market data integration
 *       - Conversation memory management
 *       - Session-based context continuity
 *       - Specialized handlers for each demand type
 *     tags: [Agent Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentChatRequest'
 *           examples:
 *             action_request:
 *               summary: Action Request (Buy/Sell)
 *               value:
 *                 message: "I want to buy 0.5 ETH right now"
 *             strategy_request:
 *               summary: Strategy Request
 *               value:
 *                 message: "I have $1000 to invest in crypto for long term, what strategy do you recommend?"
 *             information_request:
 *               summary: Information Request
 *               value:
 *                 message: "What's the current price of SEI and how has it performed this week?"
 *             feedback_request:
 *               summary: Feedback Request
 *               value:
 *                 message: "I bought 0.5 ETH yesterday for $1600, was this a good decision?"
 *     responses:
 *       200:
 *         description: Agent chat response with classified demand and appropriate handling
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ActionResponse'
 *                 - $ref: '#/components/schemas/StrategyResponse'
 *                 - $ref: '#/components/schemas/InformationResponse'
 *                 - $ref: '#/components/schemas/FeedbackResponse'
 *             examples:
 *               action_response:
 *                 summary: Action Response Example
 *                 value:
 *                   success: true
 *                   data:
 *                     sessionId: "127.0.0.1_PostmanRuntime/7.32.3"
 *                     demandClassification:
 *                       category: "action"
 *                       reason: "User wants to perform a buy action for ETH"
 *                     demandType: "action"
 *                     extractedParameters:
 *                       actionType: "buy"
 *                       token: "ETH"
 *                       amount: "0.5"
 *                       urgency: "immediate"
 *                       needsWalletAccess: true
 *                     actionPlan: "Step-by-step execution plan for buying 0.5 ETH..."
 *                     recommendations:
 *                       - "Ensure wallet is connected and has sufficient balance"
 *                       - "Check current gas fees before executing"
 *                     marketData: []
 *                     timestamp: "2024-01-15T10:30:00.000Z"
 *               strategy_response:
 *                 summary: Strategy Response Example
 *                 value:
 *                   success: true
 *                   data:
 *                     sessionId: "127.0.0.1_PostmanRuntime/7.32.3"
 *                     demandClassification:
 *                       category: "strategy"
 *                       reason: "User is seeking investment strategy advice"
 *                     demandType: "strategy"
 *                     strategyParameters:
 *                       budget: "$1000"
 *                       riskTolerance: "moderate"
 *                       timeHorizon: "long"
 *                     strategyPlan: "Comprehensive long-term investment strategy..."
 *                     allocations:
 *                       ETH: "40%"
 *                       BTC: "30%"
 *                       SEI: "20%"
 *                       USDC: "10%"
 *                     timestamp: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *             example:
 *               success: false
 *               errors:
 *                 - msg: "Message is required"
 *                   param: "message"
 *       500:
 *         description: Server error or AI service not configured
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
 *                 error:
 *                   type: string
 *             examples:
 *               ai_not_configured:
 *                 summary: AI Service Not Configured
 *                 value:
 *                   success: false
 *                   message: "AI service not configured. Please set TOGETHER_API_KEY environment variable."
 *               processing_error:
 *                 summary: Processing Error
 *                 value:
 *                   success: false
 *                   message: "Failed to process agent chat request"
 *                   error: "Detailed error message"
 */
router.post('/', [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
], agentChat);

module.exports = router; 