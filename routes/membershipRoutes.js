const express = require('express');
const router = express.Router();
const {
  applyForMembership,
  getAllApplications,
  getMembershipApplicationById,
  approveMembershipApplication,
  rejectMembershipApplication,
} = require('../controllers/membershipController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

// @route   POST /api/memberships/apply
// @desc    User applies for a new membership
// @access  Private (Authenticated User)
router.post('/apply', protect, applyForMembership);

// @route   GET /api/memberships/applications
// @desc    Get all membership applications (for Admins/Executives)
// @access  Private (Super Admin, Executive)
router.get(
  '/applications',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getAllApplications
);

// @route   GET /api/memberships/applications/:applicationId
// @desc    Get a single membership application by ID (for Admins/Executives)
// @access  Private (Super Admin, Executive)
router.get(
  '/applications/:applicationId',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getMembershipApplicationById
);

// @route   PUT /api/memberships/applications/:applicationId/approve
// @desc    Approve a membership application (for Admins/Executives)
// @access  Private (Super Admin, Executive)
router.put(
  '/applications/:applicationId/approve',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  approveMembershipApplication
);

// @route   PUT /api/memberships/applications/:applicationId/reject
// @desc    Reject a membership application (for Admins/Executives)
// @access  Private (Super Admin, Executive)
router.put(
  '/applications/:applicationId/reject',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  rejectMembershipApplication
);

module.exports = router;
