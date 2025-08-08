const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts
} = require('../controllers/productController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management endpoints
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a paginated list of products with optional filtering and search
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [electronics, clothing, books, home, sports, other]
 *         description: Filter by category
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name and description
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: Products retrieved successfully
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
 *                   example: 10
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     next:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                           example: 2
 *                         limit:
 *                           type: number
 *                           example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', getProducts);

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', getProductById);

// @desc    Create new product
// @route   POST /api/products
// @access  Private (simplified for demo)
router.post('/', [
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('brand').notEmpty().withMessage('Brand is required'),
  body('countInStock').isNumeric().withMessage('Stock count must be a number'),
  body('createdBy').notEmpty().withMessage('Created by user ID is required')
], createProduct);

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (simplified for demo)
router.put('/:id', updateProduct);

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (simplified for demo)
router.delete('/:id', deleteProduct);

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
router.get('/category/:category', getProductsByCategory);

// @desc    Get featured products
// @route   GET /api/products/featured/all
// @access  Public
router.get('/featured/all', getFeaturedProducts);

module.exports = router; 