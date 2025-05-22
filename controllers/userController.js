const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const { ROLES } = require('../utils/constants');

// @desc    Get current user's profile
// @route   GET /api/users/me
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware
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
      updatedAt: user.updatedAt,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update current user's profile
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
    user.address = req.body.address || user.address;

    // Fields not allowed to be updated directly via this route:
    // email, password, role, isActive, isVerified, membershipDetails

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email, // Send back email, even though not updatable here
      role: updatedUser.role, // Send back role
      phoneNumber: updatedUser.phoneNumber,
      address: updatedUser.address,
      isActive: updatedUser.isActive,
      isVerified: updatedUser.isVerified,
      membershipDetails: updatedUser.membershipDetails,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user by ID (for Admins/Executives)
// @route   GET /api/users/:userId
// @access  Private (Super Admin, Executive)
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('-password');

  if (user) {
    // Check if the requesting user has permission to view this user
    // This is already handled by authorize middleware, but double check is fine
    // if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.EXECUTIVE) {
    //   res.status(403);
    //   throw new Error('Not authorized to view this user profile');
    // }
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
      updatedAt: user.updatedAt,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserById,
};
