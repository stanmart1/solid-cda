const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const notificationService = require('../services/notificationService'); // Added
const asyncHandler = require('express-async-handler'); // Simple middleware for handling exceptions within async express routes
const { ROLES } = require('../utils/constants');

// Utility to generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, phoneNumber, address, membershipDetails } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Please add all required fields (firstName, lastName, email, password)');
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: role || ROLES.TENANT, // Default to Tenant if not provided
    phoneNumber,
    address,
    membershipDetails,
  });

  if (user) {
    const token = generateToken(user._id, user.role);

    // Trigger welcome notification
    try {
      await notificationService.triggerWelcomeNotification(user);
    } catch (notificationError) {
      console.error(`Welcome notification failed for user ${user._id}:`, notificationError);
      // Do not fail the registration if notification fails. Log it.
    }

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      isActive: user.isActive,
      isVerified: user.isVerified,
      membershipDetails: user.membershipDetails,
      createdAt: user.createdAt,
      token,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate a user (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Check for user by email
  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.comparePassword(password))) {
    const token = generateToken(user._id, user.role);
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token,
    });
  } else {
    res.status(401); // Unauthorized
    throw new Error('Invalid email or password');
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the auth middleware
  const user = await User.findById(req.user.id).select('-password');

  if (user) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      isActive: user.isActive,
      isVerified: user.isVerified,
      membershipDetails: user.membershipDetails,
      createdAt: user.createdAt,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
  generateToken, // Exporting generateToken for use in other potential services if needed
};
