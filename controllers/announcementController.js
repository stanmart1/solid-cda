const asyncHandler = require('express-async-handler');
const announcementService = require('../services/announcementService');
const { ROLES } = require('../utils/constants');

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private (Super Admin, Executive)
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, targetRoles, publishDate, expiryDate, notifyUsersByEmail } = req.body;
  const createdBy = req.user.id; // From protect middleware

  if (!title || !message || !targetRoles) {
    res.status(400);
    throw new Error('Title, message, and targetRoles are required.');
  }

  // Validate targetRoles - ensure it's an array and contains valid roles or 'all'
  if (!Array.isArray(targetRoles) || targetRoles.length === 0) {
    res.status(400);
    throw new Error('targetRoles must be a non-empty array (e.g., ["Tenant"], ["all"]).');
  }
  // Further validation for individual roles can be added if needed.

  const announcement = await announcementService.createAnnouncement(
    title,
    message,
    targetRoles,
    createdBy,
    publishDate, // Optional, defaults in service
    expiryDate,  // Optional
    notifyUsersByEmail || false // Optional
  );

  res.status(201).json(announcement);
});

// @desc    Get active announcements for the current user (based on role)
// @route   GET /api/announcements
// @access  Private (Authenticated users)
const getAnnouncements = asyncHandler(async (req, res) => {
  const userRole = req.user.role; // From protect middleware
  const isUserAuthenticated = !!req.user;

  const announcements = await announcementService.getAnnouncementsForUser(userRole, isUserAuthenticated);
  res.json(announcements);
});


// @desc    Get a specific announcement by ID (for admin viewing/editing)
// @route   GET /api/announcements/:id
// @access  Private (Super Admin, Executive)
const getAnnouncementById = asyncHandler(async (req, res) => {
    const announcement = await announcementService.Announcement.findById(req.params.id)
                                .populate('createdBy', 'firstName lastName');
    if (!announcement) {
        res.status(404);
        throw new Error('Announcement not found');
    }
    res.json(announcement);
});


// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private (Super Admin, Executive)
const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcementId = req.params.id;
  const updatedByUserId = req.user.id;

  // Ensure only allowed fields are passed or handle them in the service
  const { title, message, targetRoles, publishDate, expiryDate, isGlobal } = req.body;
  const updateData = { title, message, targetRoles, publishDate, expiryDate, isGlobal };

  // Remove undefined fields so they don't overwrite existing values with nulls if not provided
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);


  if (Object.keys(updateData).length === 0) {
    res.status(400);
    throw new Error('No update data provided.');
  }

  const announcement = await announcementService.updateAnnouncement(announcementId, updateData, updatedByUserId);

  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found or update failed.');
  }

  res.json(announcement);
});

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Super Admin, Executive)
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcementId = req.params.id;
  const success = await announcementService.deleteAnnouncement(announcementId);

  if (!success) {
    res.status(404);
    throw new Error('Announcement not found or delete failed.');
  }

  res.status(200).json({ message: 'Announcement deleted successfully.' });
});

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
};
