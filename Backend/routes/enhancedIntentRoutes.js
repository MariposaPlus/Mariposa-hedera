const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const promptRouterController = require('../controllers/promptRouterController');

// The controller is already an instance, no need to instantiate
const controller = promptRouterController;

/**
 * Enhanced message processing with intent validation
 * POST /api/enhanced-intent/process
 */
router.post('/process', [
  body('message')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('Session ID must be a string')
], controller.processMessageWithValidation);

/**
 * Process interactive response from user
 * POST /api/enhanced-intent/interactive-response
 */
router.post('/interactive-response', [
  body('originalIntent')
    .exists()
    .withMessage('Original intent is required'),
  body('userResponses')
    .isObject()
    .withMessage('User responses must be an object'),
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string')
], controller.processInteractiveResponse);

/**
 * Get contacts and tokens data
 * GET /api/enhanced-intent/contacts-tokens
 */
router.get('/contacts-tokens', controller.getContactsAndTokens);

/**
 * Get supported actions and their required arguments
 * GET /api/enhanced-intent/supported-actions
 */
router.get('/supported-actions', (req, res) => {
  try {
    const supportedActions = {
      transfer: {
        name: 'Transfer Tokens',
        description: 'Send HBAR or tokens to another account',
        requiredArgs: ['recipient', 'amount'],
        optionalArgs: ['tokenId'],
        examples: [
          'Send 100 HBAR to Samir',
          'Transfer 50 USDC to Alice',
          'Send 1000 SAUCE to 0.0.1234'
        ]
      },
      swap: {
        name: 'Swap Tokens',
        description: 'Exchange one token for another using SaucerSwap',
        requiredArgs: ['fromToken', 'toToken', 'amount'],
        optionalArgs: ['swapType', 'slippage'],
        examples: [
          'Swap 100 HBAR for USDC',
          'Exchange my SAUCE for USDT',
          'Convert 1000 USDC to HBAR'
        ]
      },
      createAgent: {
        name: 'Create AI Agent',
        description: 'Create a new AI trading agent',
        requiredArgs: ['name', 'description'],
        optionalArgs: ['strategy', 'parameters'],
        examples: [
          'Create a DCA trading agent',
          'Make an agent called "Arbitrage Bot"',
          'Create agent for portfolio rebalancing'
        ]
      },
      stake: {
        name: 'Stake Tokens',
        description: 'Stake tokens for rewards',
        requiredArgs: ['amount'],
        optionalArgs: ['tokenId', 'validator'],
        examples: [
          'Stake 1000 HBAR',
          'Delegate to validator 0.0.800'
        ]
      },
      associateToken: {
        name: 'Associate Token',
        description: 'Associate a token with your account',
        requiredArgs: ['tokenId'],
        optionalArgs: [],
        examples: [
          'Associate token 0.0.123456',
          'Associate USDC token'
        ]
      },
      createTopic: {
        name: 'Create Topic',
        description: 'Create a new topic for messaging',
        requiredArgs: ['memo'],
        optionalArgs: ['submitKey'],
        examples: [
          'Create topic for price alerts',
          'Make new topic "trading signals"'
        ]
      },
      sendMessage: {
        name: 'Send Message',
        description: 'Send a message to a topic',
        requiredArgs: ['topicId', 'message'],
        optionalArgs: [],
        examples: [
          'Send "hello" to topic 0.0.456',
          'Publish update to topic'
        ]
      }
    };

    res.json({
      success: true,
      data: supportedActions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check for enhanced intent service
 * GET /api/enhanced-intent/health
 */
router.get('/health', (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      service: 'Enhanced Intent Service',
      version: '1.0.0',
      features: [
        'Intent classification',
        'Argument validation',
        'Contact resolution',
        'Token lookup',
        'Interactive components'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
