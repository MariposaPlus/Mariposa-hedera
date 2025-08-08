const express = require('express');
const { body } = require('express-validator');
const { createAgentWithHedera } = require('../controllers/agentController');

// Alias router for /api/hedera/agents to match client expectation
const router = express.Router();

router.post('/', [
  body('name')
    .notEmpty()
    .withMessage('Agent name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Agent name must be between 2 and 100 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('agentType')
    .optional()
    .isIn(['strategy', 'actions', 'information', 'feedback', 'general'])
    .withMessage('Agent type must be one of: strategy, actions, information, feedback, general'),
  body('hederaOptions.initialBalance')
    .optional()
    .isNumeric()
    .withMessage('Initial balance must be a number')
], createAgentWithHedera);

module.exports = router;


