const asyncHandler = require('express-async-handler');
const MembershipApplication = require('../models/membershipApplicationModel');
const User = require('../models/userModel');
const { ROLES } = require('../utils/constants');
const notificationService = require('../services/notificationService'); // Added

// @desc    User applies for a new membership
// @route   POST /api/memberships/apply
// @access  Private (Authenticated User)
const applyForMembership = asyncHandler(async (req, res) => {
  const { membershipTypeRequested, documents } = req.body;
  const userId = req.user.id; // From protect middleware

  if (!membershipTypeRequested) {
    res.status(400);
    throw new Error('Membership type requested is required.');
  }

  // Optional: Check if user already has a pending or approved application for the same type
  const existingApplication = await MembershipApplication.findOne({
    user: userId,
    membershipTypeRequested,
    status: { $in: ['pending', 'approved'] },
  });

  if (existingApplication) {
    res.status(400);
    throw new Error(
      `You already have a '${existingApplication.status}' application for ${membershipTypeRequested}.`
    );
  }

  const application = await MembershipApplication.create({
    user: userId,
    membershipTypeRequested,
    documents: documents || [], // Ensure documents is an array
  });

  res.status(201).json(application);
});

// @desc    Get all membership applications (for Admins/Executives)
// @route   GET /api/memberships/applications
// @access  Private (Super Admin, Executive)
const getAllApplications = asyncHandler(async (req, res) => {
  // TODO: Implement pagination and filtering (e.g., by status)
  const applications = await MembershipApplication.find({})
    .populate('user', 'firstName lastName email') // Populate user details
    .populate('reviewedBy', 'firstName lastName email') // Populate reviewer details
    .sort({ applicationDate: -1 }); // Sort by newest first

  res.json(applications);
});

// @desc    Get a single membership application by ID (for Admins/Executives)
// @route   GET /api/memberships/applications/:applicationId
// @access  Private (Super Admin, Executive)
const getMembershipApplicationById = asyncHandler(async (req, res) => {
  const application = await MembershipApplication.findById(
    req.params.applicationId
  )
    .populate('user', 'firstName lastName email role')
    .populate('reviewedBy', 'firstName lastName email');

  if (!application) {
    res.status(404);
    throw new Error('Membership application not found');
  }
  res.json(application);
});

// @desc    Approve a membership application (for Admins/Executives)
// @route   PUT /api/memberships/applications/:applicationId/approve
// @access  Private (Super Admin, Executive)
const approveMembershipApplication = asyncHandler(async (req, res) => {
  const applicationId = req.params.applicationId;
  const reviewerId = req.user.id; // From protect middleware

  const application = await MembershipApplication.findById(applicationId);

  if (!application) {
    res.status(404);
    throw new Error('Membership application not found');
  }

  if (application.status === 'approved') {
    res.status(400);
    throw new Error('Application is already approved.');
  }

  // Update application status
  application.status = 'approved';
  application.reviewDate = Date.now();
  application.reviewedBy = reviewerId;
  application.comments = req.body.comments || application.comments; // Optional comments on approval

  const updatedApplication = await application.save();

  // Update the user's model
  const userToUpdate = await User.findById(application.user);
  if (!userToUpdate) {
    // This should ideally not happen if DB is consistent
    console.error(`User with ID ${application.user} not found for approved application ${applicationId}`);
    res.status(500); // Internal server error
    throw new Error('User associated with application not found. Approval failed.');
  }

  // Example: Update user's role and membership details
  // The exact logic for role update might depend on membershipTypeRequested
  // For simplicity, let's assume membershipTypeRequested directly maps to a role or updates a detail
  // This logic needs to be carefully defined based on business rules.
  
  // A simple example: if membershipTypeRequested implies a role change
  // This is a placeholder. The actual mapping from `membershipTypeRequested` to `role`
  // and `membershipDetails` needs to be clearly defined.
  // For example, 'Property Owner Basic' -> role: 'Property Owner', membershipDetails.type: 'Basic'
  
  // Let's assume 'membershipTypeRequested' could be one of the ROLES enum for now
  // or a more specific type like "Premium Tenant"
  
  // For demonstration, let's say some membership types directly set the user's role
  if (Object.values(ROLES).includes(application.membershipTypeRequested)) {
      userToUpdate.role = application.membershipTypeRequested;
  }
  
  userToUpdate.membershipDetails = {
    membershipType: application.membershipTypeRequested,
    startDate: new Date(), // Or a specific start date from application if applicable
    // endDate: Calculate based on membership duration, if any
    status: 'Active',
  };
  userToUpdate.isVerified = true; // Often, approved members are considered verified

  await userToUpdate.save();

  // Trigger notification for membership approval
  try {
    await notificationService.triggerMembershipStatusUpdateNotification(updatedApplication, 'approved');
  } catch (notificationError) {
    console.error(`Membership approved notification failed for app ${updatedApplication._id}:`, notificationError);
    // Do not fail the process if notification fails. Log it.
  }

  res.json({
    message: 'Membership application approved successfully.',
    application: updatedApplication,
    user: {
        _id: userToUpdate._id,
        role: userToUpdate.role,
        membershipDetails: userToUpdate.membershipDetails,
        isVerified: userToUpdate.isVerified
    }
  });
});

// @desc    Reject a membership application (for Admins/Executives)
// @route   PUT /api/memberships/applications/:applicationId/reject
// @access  Private (Super Admin, Executive)
const rejectMembershipApplication = asyncHandler(async (req, res) => {
  const applicationId = req.params.applicationId;
  const reviewerId = req.user.id; // From protect middleware
  const { comments } = req.body;

  if (!comments) {
    res.status(400);
    throw new Error('Rejection comments are required.');
  }

  const application = await MembershipApplication.findById(applicationId);

  if (!application) {
    res.status(404);
    throw new Error('Membership application not found');
  }

  if (application.status === 'rejected') {
    res.status(400);
    throw new Error('Application is already rejected.');
  }
  if (application.status === 'approved') {
    // Optionally, decide if an approved application can be rejected.
    // For now, let's prevent this.
    res.status(400);
    throw new Error('Cannot reject an already approved application. Consider revoking membership instead.');
  }

  application.status = 'rejected';
  application.reviewDate = Date.now();
  application.reviewedBy = reviewerId;
  application.comments = comments;

  const updatedApplication = await application.save();

  // Optionally update user's membershipDetails if they had a previous active one that's now void
  // For instance, userToUpdate.membershipDetails.status = 'Rejected Application';
  // For now, we are not changing the user model on rejection.

  // Trigger notification for membership rejection
  try {
    await notificationService.triggerMembershipStatusUpdateNotification(updatedApplication, 'rejected');
  } catch (notificationError) {
    console.error(`Membership rejected notification failed for app ${updatedApplication._id}:`, notificationError);
    // Do not fail the process if notification fails. Log it.
  }

  res.json({
    message: 'Membership application rejected successfully.',
    application: updatedApplication,
  });
});

module.exports = {
  applyForMembership,
  getAllApplications,
  getMembershipApplicationById,
  approveMembershipApplication,
  rejectMembershipApplication,
};
