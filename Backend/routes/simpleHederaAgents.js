const express = require('express');
const router = express.Router();
const simpleHederaAgentController = require('../controllers/simpleHederaAgentController');

// Routes for /api/agents/hedera
router.get('/', simpleHederaAgentController.getAllAgents);
router.get('/user/:userId', simpleHederaAgentController.getAgentsByUserId);
router.get('/:id', simpleHederaAgentController.getAgentById);
router.get('/:id/balance', simpleHederaAgentController.getAgentBalance);
router.post('/', simpleHederaAgentController.createAgent);
router.put('/:id', simpleHederaAgentController.updateAgent);
router.delete('/:id', simpleHederaAgentController.deleteAgent);

module.exports = router;