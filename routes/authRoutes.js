const express = require('express');
const router = express.Router();

// Define User schema for Swagger documentation
// This is typically done in a central place or directly in model files if swagger-jsdoc is configured to read them.
// For simplicity here, defining a basic User representation for request/response.
/**
 * @swagger
 * components:
 *   schemas:
 *     UserAuthInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address.
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (min 6 characters).
 *     UserRegistrationInput:
 *       allOf:
 *         - $ref: '#/components/schemas/UserAuthInput'
 *         - type: object
 *           required:
 *             - firstName
 *             - lastName
 *           properties:
 *             firstName:
 *               type: string
 *               description: User's first name.
 *             lastName:
 *               type: string
 *               description: User's last name.
 *             role:
 *               type: string
 *               enum: ['Property Owner', 'Tenant', 'Executive', 'Super Admin']
 *               default: 'Tenant'
 *               description: User's role.
 *             phoneNumber:
 *               type: string
 *               description: User's phone number (optional).
 *             address:
 *               type: string
 *               description: User's address (optional).
 *     UserAuthResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID.
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *         token:
 *           type: string
 *           description: JWT token for authentication.
 *     UserProfileResponse:
 *        type: object
 *        properties:
 *          _id:
 *            type: string
 *          firstName:
 *            type: string
 *          lastName:
 *            type: string
 *          email:
 *            type: string
 *            format: email
 *          role:
 *            type: string
 *          phoneNumber:
 *            type: string
 *          address:
 *            type: string
 *          isActive:
 *            type: boolean
 *          isVerified:
 *            type: boolean
 *          membershipDetails:
 *            type: object # Define further if needed
 *          createdAt:
 *            type: string
 *            format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
const {
  registerUser,
  loginUser,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistrationInput'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse' # Assuming registration returns similar info to login
 *       400:
 *         description: Invalid input, or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', registerUser);


// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserAuthInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
 *       400:
 *         description: Invalid email or password (or missing fields)
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', loginUser);


// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: Not authorized, token failed or no token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/me', protect, getMe);

module.exports = router;
