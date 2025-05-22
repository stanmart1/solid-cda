const Announcement = require('../models/announcementModel');
const User = require('../models/userModel'); // For finding users by role for notifications
const { ROLES } = require('../utils/constants');
const notificationService = require('./notificationService'); // To send notifications about new announcements

/**
 * Creates a new announcement and optionally notifies users.
 * @param {string} title - The title of the announcement.
 * @param {string} message - The main content of the announcement.
 * @param {string[]} targetRoles - Array of roles to target (e.g., ['Tenant', 'Property Owner'], or ['all']).
 * @param {mongoose.Types.ObjectId} createdBy - User ID of the admin/executive creating the announcement.
 * @param {Date} [publishDate] - Optional date to publish. Defaults to now.
 * @param {Date} [expiryDate] - Optional date for the announcement to expire.
 * @param {boolean} [notifyUsersByEmail=false] - Whether to send email notifications to targeted users.
 * @returns {Promise<Announcement>} - The created announcement object.
 */
const createAnnouncement = async (
  title,
  message,
  targetRoles,
  createdBy,
  publishDate = new Date(),
  expiryDate = null,
  notifyUsersByEmail = false
) => {
  if (!title || !message || !targetRoles || !createdBy) {
    throw new Error('Title, message, targetRoles, and createdBy are required for an announcement.');
  }

  const announcement = await Announcement.create({
    title,
    message,
    targetRoles: targetRoles.includes('all') ? [ROLES.SUPER_ADMIN, ROLES.EXECUTIVE, ROLES.PROPERTY_OWNER, ROLES.TENANT] : targetRoles, // Expand 'all'
    createdBy,
    publishDate,
    expiryDate,
    isGlobal: targetRoles.includes('all'), // Consider 'all' as global
  });

  // If notifyUsersByEmail is true, find users and send them an email
  if (notifyUsersByEmail && announcement) {
    let usersToNotify = [];
    if (targetRoles.includes('all')) {
      usersToNotify = await User.find({ isActive: true }).select('email firstName');
    } else {
      usersToNotify = await User.find({ role: { $in: targetRoles }, isActive: true }).select('email firstName');
    }

    const emailSubject = `New Announcement: ${announcement.title}`;
    const emailHtmlBody = `
      <h1>${announcement.title}</h1>
      <p>Dear Resident,</p>
      <p>${announcement.message}</p>
      <br>
      <p>Thank you,</p>
      <p>CDA Management</p>
    `;

    for (const user of usersToNotify) {
      // Use the generic notification service
      await notificationService.createAndSendNotification({
        userId: user._id,
        type: 'email',
        recipientAddress: user.email,
        subject: emailSubject,
        content: emailHtmlBody,
        textBody: announcement.message, // Simple text version
      });
    }
  }

  return announcement;
};

/**
 * Fetches active and relevant announcements for a given user role.
 * @param {string} userRole - The role of the user (e.g., 'Tenant', 'Executive').
 * @param {boolean} isUserAuthenticated - Whether the user is authenticated.
 * @returns {Promise<Announcement[]>} - An array of announcements.
 */
const getAnnouncementsForUser = async (userRole, isUserAuthenticated = true) => {
  const now = new Date();
  const query = {
    publishDate: { $lte: now },
    $or: [
      { expiryDate: { $gte: now } },
      { expiryDate: null }, // No expiry date
    ],
  };

  if (isUserAuthenticated && userRole) {
    // Authenticated users see announcements targeted to their role OR 'all' roles
    query.targetRoles = { $in: [userRole, ROLES.SUPER_ADMIN, ROLES.EXECUTIVE, ROLES.PROPERTY_OWNER, ROLES.TENANT] }; // Query for 'all' by listing all roles
  } else {
    // Unauthenticated users or those with no specific role only see 'isGlobal' announcements
    // or announcements targeted to a generic 'public' role if you implement that.
    // For now, let's assume 'all' also implies global for simplicity if not authenticated.
    query.targetRoles = { $in: [ROLES.SUPER_ADMIN, ROLES.EXECUTIVE, ROLES.PROPERTY_OWNER, ROLES.TENANT] }; // Effectively 'all'
    // Alternatively, if you have a specific 'isGlobal' flag:
    // query.isGlobal = true;
  }

  return Announcement.find(query)
    .populate('createdBy', 'firstName lastName') // Populate who created it
    .sort({ publishDate: -1 }); // Show newest first
};


/**
 * Updates an existing announcement.
 * @param {string} announcementId - The ID of the announcement to update.
 * @param {object} updateData - The fields to update.
 * @param {mongoose.Types.ObjectId} updatedByUserId - User ID of the admin/executive updating.
 * @returns {Promise<Announcement | null>} - The updated announcement or null if not found.
 */
const updateAnnouncement = async (announcementId, updateData, updatedByUserId) => {
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
        return null;
    }

    // Ensure that only allowed fields are updated and createdBy is not changed.
    const allowedUpdates = ['title', 'message', 'targetRoles', 'publishDate', 'expiryDate', 'isGlobal'];
    Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
            announcement[key] = updateData[key];
        }
    });

    // Optionally, log who updated it if your schema supports it (e.g., an 'updatedBy' field)
    // announcement.updatedBy = updatedByUserId; // If you add this field to the schema

    await announcement.save();
    return announcement;
};

/**
 * Deletes an announcement.
 * @param {string} announcementId - The ID of the announcement to delete.
 * @returns {Promise<boolean>} - True if deleted, false otherwise.
 */
const deleteAnnouncement = async (announcementId) => {
    const result = await Announcement.findByIdAndDelete(announcementId);
    return !!result;
};


module.exports = {
  createAnnouncement,
  getAnnouncementsForUser,
  updateAnnouncement,
  deleteAnnouncement,
};
