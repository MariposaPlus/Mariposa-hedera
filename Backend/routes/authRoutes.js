const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const router = express.Router();

/**
 * @swagger
 * /api/auth/verify-token:
 *   get:
 *     summary: Verify JWT token and return user data
 *     description: Validates a JWT token and returns the associated user and wallet information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 wallet:
 *                   $ref: '#/components/schemas/Wallet'
 *       401:
 *         description: Invalid or expired token
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
 *                   example: "Invalid token"
 */
router.get('/verify-token', async (req, res) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user's wallet if it exists
      const wallet = await Wallet.findOne({ userId: user._id });

      // Return user and wallet data
      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          walletAddress: user.walletAddress || '',
          walletId: user.walletId || '',
          createdAt: user.createdAt
        },
        wallet: wallet ? {
          id: wallet._id,
          address: wallet.address,
          accountId: wallet.accountId || '',
          network: wallet.network,
          walletClass: wallet.walletClass,
          balance: wallet.balance || {},
          isActive: wallet.isActive
        } : null
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
});

module.exports = router;