const express = require('express');
const router = express.Router();
const hederaAgentKitController = require('../controllers/hederaAgentKitController');

// Basic Hedera operations
router.get('/tools', hederaAgentKitController.getAvailableTools);
router.get('/client-info', hederaAgentKitController.getClientInfo);

// Balance queries
router.get('/balance', hederaAgentKitController.getHbarBalance);
router.get('/my-balance', hederaAgentKitController.getMyBalance);

// Token operations
router.post('/create-token', hederaAgentKitController.createFungibleToken);

// Topic operations
router.post('/create-topic', hederaAgentKitController.createTopic);
router.post('/submit-message', hederaAgentKitController.submitTopicMessage);

// Evaluation system
router.post('/create-evaluation-topic', hederaAgentKitController.createEvaluationTopic);
router.post('/submit-evaluation-message', hederaAgentKitController.submitEvaluationMessage);
router.post('/send-validation-message', hederaAgentKitController.sendValidationMessage);
router.get('/evaluation-topic/:topicId', hederaAgentKitController.getEvaluationTopic);
router.get('/evaluation-topics', hederaAgentKitController.getEvaluationTopics);

module.exports = router;