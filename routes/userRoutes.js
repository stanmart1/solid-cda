const express = require('express');
const router = express.Router();

// Re-using UserProfileResponse from authRoutes.js for Swagger documentation
// If not already defined there, you'd define it here or in a central place.
// For example:
/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfileUpdateRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           description: User's new first name.
 *         lastName:
 *           type: string
 *           description: User's new last name.
 *         phoneNumber:
 *           type: string
 *           description: User's new phone number.
 *         address:
 *           type: string
 *           description: User's new address.
 *   securitySchemes:
 *     bearerAuth: # Ensure this matches the global definition or define if not global
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * tags: # Define tags used in this file
 *   - name: Users
 *     description: User profile management
 */
const {
  getUserProfile,
  updateUserProfile,
  getUserById,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

// @route   GET api/users/me
// @desc    Get current user's profile (Duplicate of /api/auth/me, consider removing one or aliasing)
// @access  Private

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current logged-in user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse' # Defined in authRoutes or globally
 *       401:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.get('/me', protect, getUserProfile);


// @route   PUT api/users/me
// @desc    Update current user's profile
// @access  Private
/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current logged-in user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfileUpdateRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.put('/me', protect, updateUserProfile);


// @route   GET api/users/:userId
// @desc    Get user by ID (Admin/Executive access)
// @access  Private (Super Admin, Executive)
/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user profile by ID (Admin/Executive access)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: Not authorized (e.g., token invalid)
 *       403:
 *         description: Forbidden (e.g., user role not permitted)
 *       404:
 *         description: User not found
 */
router.get(
  '/:userId',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]), // authorize calls protect internally
  getUserById
);

module.exports = router;
