const express = require('express');
const { param, query } = require('express-validator');
const WalletService = require('../services/walletService');
const Wallet = require('../models/Wallet');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Wallet:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Wallet ID
 *         agentId:
 *           type: string
 *           description: Associated agent ID
 *         agentName:
 *           type: string
 *           description: Agent name
 *         walletAddress:
 *           type: string
 *           description: Wallet address
 *         walletClass:
 *           type: string
 *           enum: [trading, staking, defi, memecoin, arbitrage]
 *           description: Wallet classification
 *         network:
 *           type: string
 *           description: Blockchain network
 *         balance:
 *           type: object
 *           properties:
 *             native:
 *               type: number
 *               description: Native token balance
 *             tokens:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   symbol:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   usdValue:
 *                     type: number
 *         portfolioValue:
 *           type: object
 *           properties:
 *             current:
 *               type: number
 *             initial:
 *               type: number
 *             peak:
 *               type: number
 *         riskMetrics:
 *           type: object
 *           properties:
 *             maxDrawdown:
 *               type: number
 *             volatility:
 *               type: number
 *             sharpeRatio:
 *               type: number
 *             winRate:
 *               type: number
 */

/**
 * @swagger
 * /api/wallets/agent/{agentId}:
 *   get:
 *     summary: Get wallet by agent ID
 *     description: Retrieve wallet information for a specific agent
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Wallet information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/agent/:agentId', [
  param('agentId').isMongoId().withMessage('Invalid agent ID')
], async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const wallet = await WalletService.getWalletByAgentId(agentId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found for this agent'
      });
    }
    
    // Don't return the private key in the response
    const walletData = wallet.toObject();
    delete walletData.encryptedPrivateKey;
    
    res.json({
      success: true,
      data: walletData
    });
    
  } catch (error) {
    console.error('Get Wallet Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/wallets/{walletId}/balance:
 *   put:
 *     summary: Update wallet balance
 *     description: Update the balance of a specific wallet
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               native:
 *                 type: number
 *                 description: Native token balance
 *               tokens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     usdValue:
 *                       type: number
 *     responses:
 *       200:
 *         description: Balance updated successfully
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.put('/:walletId/balance', [
  param('walletId').isMongoId().withMessage('Invalid wallet ID')
], async (req, res) => {
  try {
    const { walletId } = req.params;
    const balanceData = req.body;
    
    const wallet = await WalletService.updateBalance(walletId, balanceData);
    
    res.json({
      success: true,
      data: {
        walletId: wallet._id,
        portfolioValue: wallet.portfolioValue,
        balance: wallet.balance,
        message: 'Balance updated successfully'
      }
    });
    
  } catch (error) {
    console.error('Update Balance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update balance',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/wallets/{walletId}/trade:
 *   post:
 *     summary: Record a trade
 *     description: Record a trading transaction for a wallet
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - tokenPair
 *               - amount
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [BUY, SELL, SWAP, STAKE, UNSTAKE, FARM, HARVEST]
 *               tokenPair:
 *                 type: string
 *                 example: "USDC/BTC"
 *               amount:
 *                 type: number
 *               price:
 *                 type: number
 *               txHash:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *                 default: pending
 *     responses:
 *       200:
 *         description: Trade recorded successfully
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.post('/:walletId/trade', [
  param('walletId').isMongoId().withMessage('Invalid wallet ID')
], async (req, res) => {
  try {
    const { walletId } = req.params;
    const tradeData = req.body;
    
    const wallet = await WalletService.recordTrade(walletId, tradeData);
    
    res.json({
      success: true,
      data: {
        walletId: wallet._id,
        tradeRecorded: true,
        totalTrades: wallet.tradingHistory.length,
        message: 'Trade recorded successfully'
      }
    });
    
  } catch (error) {
    console.error('Record Trade Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record trade',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/wallets/{walletId}/performance:
 *   get:
 *     summary: Get wallet performance metrics
 *     description: Retrieve performance metrics for a specific wallet
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
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
 *                     roi:
 *                       type: number
 *                       description: Return on investment percentage
 *                     pnl:
 *                       type: number
 *                       description: Profit and loss in USD
 *                     portfolioValue:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         initial:
 *                           type: number
 *                         peak:
 *                           type: number
 *                     riskMetrics:
 *                       type: object
 *                     totalTrades:
 *                       type: number
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/:walletId/performance', [
  param('walletId').isMongoId().withMessage('Invalid wallet ID')
], async (req, res) => {
  try {
    const { walletId } = req.params;
    
    const performance = await WalletService.getPerformanceMetrics(walletId);
    
    res.json({
      success: true,
      data: performance
    });
    
  } catch (error) {
    console.error('Get Performance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance metrics',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/wallets:
 *   get:
 *     summary: Get all wallets
 *     description: Retrieve all active wallets with optional filtering
 *     tags: [Wallets]
 *     parameters:
 *       - in: query
 *         name: walletClass
 *         schema:
 *           type: string
 *           enum: [trading, staking, defi, memecoin, arbitrage]
 *         description: Filter by wallet class
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *         description: Filter by network
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of wallets to return
 *     responses:
 *       200:
 *         description: Wallets retrieved successfully
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
 *                     wallets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Wallet'
 *                     count:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { walletClass, network, limit = 10 } = req.query;
    
    let filter = { isActive: true };
    if (walletClass) filter.walletClass = walletClass;
    if (network) filter.network = network;
    
    const wallets = await Wallet.find(filter)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate('agentId', 'name primaryStrategy')
      .select('-encryptedPrivateKey'); // Exclude private keys
    
    res.json({
      success: true,
      data: {
        wallets,
        count: wallets.length
      }
    });
    
  } catch (error) {
    console.error('Get Wallets Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallets',
      error: error.message
    });
  }
});

module.exports = router; 