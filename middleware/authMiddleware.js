const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const { ROLES } = require('../utils/constants');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const authorize = (roles = []) => {
  // roles param can be a single role string (e.g., 'Super Admin')
  // or an array of roles (e.g., ['Super Admin', 'Executive'])
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return [
    // First, ensure the user is authenticated
    protect,
    // Then, check for authorization
    (req, res, next) => {
      if (!req.user || !req.user.role) {
        res.status(401);
        throw new Error('Not authorized, user role not found');
      }

      if (roles.length && !roles.includes(req.user.role)) {
        // user's role is not authorized
        res.status(403); // Forbidden
        throw new Error(
          `User role ${req.user.role} is not authorized to access this route`
        );
      }

      // Authentication and authorization successful
      next();
    },
  ];
};

// Specific role authentications for convenience
const isSuperAdmin = authorize(ROLES.SUPER_ADMIN);
const isExecutive = authorize(ROLES.EXECUTIVE);
const isPropertyOwner = authorize(ROLES.PROPERTY_OWNER);
const isTenant = authorize(ROLES.TENANT);

module.exports = {
  protect,
  authorize,
  isSuperAdmin,
  isExecutive,
  isPropertyOwner,
  isTenant,
};
