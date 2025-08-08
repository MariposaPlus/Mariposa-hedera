const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUserWithWallet,
  createUserWithHederaWallet,
  getUserWithWallet,
  getUserByEmail
} = require('../controllers/userController');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegister:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john@example.com
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password
 *           example: password123
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john@example.com
 *         password:
 *           type: string
 *           description: User's password
 *           example: password123
 *     UserResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         token:
 *           type: string
 *           description: JWT token
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: 507f1f77bcf86cd799439011
 *             name:
 *               type: string
 *               example: John Doe
 *             email:
 *               type: string
 *               example: john@example.com
 *             role:
 *               type: string
 *               example: user
 *   tags:
 *     - name: Users
 *       description: User management and authentication
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and return JWT token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// @desc    Login user
// @route   POST /api/users/login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], loginUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users (should be protected in production)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// @desc    Get all users
// @route   GET /api/users
// @access  Public (should be protected in production)
router.get('/', getUsers);

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public (should be protected in production)
router.get('/:id', getUserById);

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public (should be protected in production)
router.put('/:id', updateUser);

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public (should be protected in production)
router.delete('/:id', deleteUser);

/**
 * @swagger
 * components:
 *   schemas:
 *     UserWalletRegister:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - walletAddress
 *         - privateKey
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (must be unique)
 *           example: john@example.com
 *         walletAddress:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           description: SEI wallet address (must be unique, 40 hex characters)
 *           example: 0x1234567890123456789012345678901234567890
 *         privateKey:
 *           type: string
 *           description: Wallet private key (will be encrypted and stored securely)
 *           example: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
 *         userType:
 *           type: string
 *           enum: [human, agent]
 *           description: Type of user account (optional, defaults to 'human')
 *           default: human
 *           example: human
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User password (optional - can be null)
 *           example: password123
 *         preferences:
 *           type: object
 *           description: User trading preferences (optional - defaults applied if not provided)
 *           properties:
 *             defaultStrategy:
 *               type: string
 *               description: Default trading strategy
 *               enum: [DCA, momentum_trading, swing_trading, hodl, arbitrage, scalping, memecoin, yield_farming, spot_trading, futures_trading, custom]
 *               default: DCA
 *               example: DCA
 *             riskTolerance:
 *               type: string
 *               description: Risk tolerance level
 *               enum: [conservative, moderate, aggressive]
 *               default: moderate
 *               example: moderate
 *             preferredTokens:
 *               type: array
 *               description: Preferred SEI network tokens
 *               items:
 *                 type: string
 *               default: [WETH, WBTC, SEI, USDC]
 *               example: [WETH, WBTC, SEI, USDC]
 *             notifications:
 *               type: object
 *               description: Notification preferences
 *               properties:
 *                 email:
 *                   type: boolean
 *                   default: true
 *                   description: Email notifications enabled
 *                 portfolio:
 *                   type: boolean
 *                   default: true
 *                   description: Portfolio update notifications
 *                 trades:
 *                   type: boolean
 *                   default: false
 *                   description: Trade execution notifications
 *     UserWalletResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 507f1f77bcf86cd799439011
 *                 name:
 *                   type: string
 *                   example: John Doe
 *                 email:
 *                   type: string
 *                   example: john@example.com
 *                 userType:
 *                   type: string
 *                   example: human
 *                 walletAddress:
 *                   type: string
 *                   example: 0x1234567890123456789012345678901234567890
 *                 walletId:
 *                   type: string
 *                   example: 507f1f77bcf86cd799439012
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *             wallet:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 507f1f77bcf86cd799439012
 *                 address:
 *                   type: string
 *                   example: 0x1234567890123456789012345678901234567890
 *                 network:
 *                   type: string
 *                   example: sei
 *                 walletClass:
 *                   type: string
 *                   example: trading
 *                 balance:
 *                   type: object
 *                 portfolioValue:
 *                   type: object
 *                 isActive:
 *                   type: boolean
 *                   example: true
 *             token:
 *               type: string
 *               description: JWT token (only provided for human users)
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         message:
 *           type: string
 *           example: User registered successfully with encrypted wallet
 */

/**
 * @swagger
 * /api/users/register-with-wallet:
 *   post:
 *     summary: Register user with wallet (minimal required fields)
 *     description: |
 *       Create a new user account with encrypted wallet integration.
 *       
 *       **Required fields only:**
 *       - name: User's full name
 *       - email: Unique email address  
 *       - walletAddress: SEI wallet address (40 hex chars)
 *       - privateKey: Wallet private key (will be encrypted)
 *       
 *       **Optional fields:**
 *       - userType: 'human' or 'agent' (defaults to 'human')
 *       - password: User password (optional)
 *       - preferences: Trading preferences (defaults applied)
 *       
 *       **Security features:**
 *       - Private keys are encrypted before storage
 *       - Email and wallet address uniqueness enforced
 *       - JWT token returned for authentication
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserWalletRegister'
 *           examples:
 *             minimal:
 *               summary: Minimal registration (only required fields)
 *               value:
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 walletAddress: "0x1234567890123456789012345678901234567890"
 *                 privateKey: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
 *             complete:
 *               summary: Complete registration with all optional fields
 *               value:
 *                 name: "Jane Smith"
 *                 email: "jane@example.com"
 *                 walletAddress: "0x9876543210987654321098765432109876543210"
 *                 privateKey: "0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456"
 *                 userType: "human"
 *                 password: "securepassword123"
 *                 preferences:
 *                   defaultStrategy: "DCA"
 *                   riskTolerance: "moderate"
 *                   preferredTokens: ["WETH", "WBTC", "SEI", "USDC"]
 *                   notifications:
 *                     email: true
 *                     portfolio: true
 *                     trades: false
 *     responses:
 *       201:
 *         description: User registered successfully with wallet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserWalletResponse'
 *       400:
 *         description: |
 *           Validation error or conflict:
 *           - Invalid email format
 *           - Invalid wallet address format
 *           - Email already exists
 *           - Wallet address already registered
 *           - Invalid private key format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validation_error:
 *                 summary: Validation error
 *                 value:
 *                   success: false
 *                   message: "Please provide a valid email"
 *               duplicate_email:
 *                 summary: Duplicate email
 *                 value:
 *                   success: false
 *                   message: "User with this email already exists"
 *               duplicate_wallet:
 *                 summary: Duplicate wallet
 *                 value:
 *                   success: false
 *                   message: "Wallet address is already registered"
 *               invalid_wallet:
 *                 summary: Invalid wallet format
 *                 value:
 *                   success: false
 *                   message: "Invalid wallet address format"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// @desc    Register user with wallet
// @route   POST /api/users/register-with-wallet
// @access  Public
router.post('/register-with-wallet', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('walletAddress').notEmpty().withMessage('Wallet address is required'),
  body('privateKey').notEmpty().withMessage('Private key is required'),
  body('userType').optional().isIn(['human', 'agent']).withMessage('User type must be human or agent'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters if provided'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object if provided')
], registerUserWithWallet);

// @desc    Create user with auto-generated Hedera wallet
// @route   POST /api/users/create-with-hedera-wallet
// @access  Public
router.post('/create-with-hedera-wallet', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('userType').optional().isIn(['human', 'agent']).withMessage('User type must be human or agent'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters if provided'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object if provided'),
  body('initialBalance').optional().isNumeric().withMessage('Initial balance must be a number')
], createUserWithHederaWallet);

/**
 * @swagger
 * /api/users/{id}/wallet:
 *   get:
 *     summary: Get user with wallet information
 *     description: Retrieve user details including linked wallet information
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User with wallet information retrieved successfully
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
 *                     user:
 *                       type: object
 *                     hasWallet:
 *                       type: boolean
 *                     walletConnected:
 *                       type: boolean
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// @desc    Get user with wallet information
// @route   GET /api/users/:id/wallet
// @access  Public (should be protected in production)
router.get('/:id/wallet', getUserWithWallet);

// @desc    Get user by email
// @route   GET /api/users/by-email/:email
// @access  Public
router.get('/by-email/:email', getUserByEmail);

module.exports = router;