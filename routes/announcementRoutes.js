const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

// @route   POST /api/announcements
// @desc    Create a new announcement
// @access  Private (Super Admin, Executive)
router.post(
  '/',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  createAnnouncement
);

// @route   GET /api/announcements
// @desc    Get active announcements for the current user
// @access  Private (Authenticated users)
router.get('/', protect, getAnnouncements);

// @route   GET /api/announcements/:id
// @desc    Get a specific announcement by ID
// @access  Private (Super Admin, Executive)
router.get(
  '/:id',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getAnnouncementById
);

// @route   PUT /api/announcements/:id
// @desc    Update an announcement
// @access  Private (Super Admin, Executive)
router.put(
  '/:id',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  updateAnnouncement
);

// @route   DELETE /api/announcements/:id
// @desc    Delete an announcement
// @access  Private (Super Admin, Executive)
router.delete(
  '/:id',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  deleteAnnouncement
);

module.exports = router;
