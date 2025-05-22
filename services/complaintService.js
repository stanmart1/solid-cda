const Complaint = require('../models/complaintModel');
const User = require('../models/userModel'); // For populating user details
const { COMPLAINT_STATUSES, ROLES } = require('../utils/constants');
// const notificationService = require('./notificationService'); // Uncomment when integrating notifications

/**
 * Submits a new complaint.
 * @param {object} complaintData - Data for the new complaint.
 * @param {mongoose.Types.ObjectId} userId - User ID of the submitter.
 * @returns {Promise<Complaint>} - The created complaint object.
 */
const submitComplaint = async (complaintData, userId) => {
  const { title, description, category, attachments } = complaintData;

  if (!title || !description || !category) {
    throw new Error('Title, description, and category are required for a complaint.');
  }

  const complaint = new Complaint({
    user: userId,
    title,
    description,
    category,
    attachments: attachments || [], // Ensure attachments is an array
    status: COMPLAINT_STATUSES[0], // 'Submitted'
  });

  await complaint.save();

  // TODO: Trigger notification to relevant executives about new complaint
  // Example: await notificationService.triggerNewComplaintNotification(complaint);

  return complaint;
};

/**
 * Fetches complaints submitted by a specific user.
 * @param {mongoose.Types.ObjectId} userId - The ID of the user.
 * @param {object} paginationOptions - Pagination settings (page, limit).
 * @returns {Promise<{complaints: Complaint[], totalPages: number, currentPage: number, totalRecords: number}>}
 */
const getUserComplaints = async (userId, paginationOptions = { page: 1, limit: 10 }) => {
  const page = parseInt(paginationOptions.page, 10) || 1;
  const limit = parseInt(paginationOptions.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { user: userId };

  const complaints = await Complaint.find(query)
    .populate('user', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('executiveComments.commentedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await Complaint.countDocuments(query);
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    complaints,
    totalPages,
    currentPage: page,
    totalRecords,
  };
};

/**
 * Fetches all complaints for Executives/Admins with potential filters.
 * @param {object} filters - Filtering criteria (status, category, assignedTo).
 * @param {object} paginationOptions - Pagination settings (page, limit).
 * @returns {Promise<{complaints: Complaint[], totalPages: number, currentPage: number, totalRecords: number}>}
 */
const getAllComplaints = async (filters = {}, paginationOptions = { page: 1, limit: 10 }) => {
  const { status, category, assignedTo, userId } = filters;
  const query = {};

  if (status) query.status = status;
  if (category) query.category = category;
  if (assignedTo) query.assignedTo = assignedTo; // Assuming assignedTo is an ID
  if (userId) query.user = userId; // Filter by user who submitted

  const page = parseInt(paginationOptions.page, 10) || 1;
  const limit = parseInt(paginationOptions.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const complaints = await Complaint.find(query)
    .populate('user', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('executiveComments.commentedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await Complaint.countDocuments(query);
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    complaints,
    totalPages,
    currentPage: page,
    totalRecords,
  };
};

/**
 * Fetches a single complaint by its ID.
 * @param {string} complaintId - The ID of the complaint.
 * @returns {Promise<Complaint|null>} - The complaint object or null if not found.
 */
const getComplaintById = async (complaintId) => {
  return Complaint.findById(complaintId)
    .populate('user', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('executiveComments.commentedBy', 'firstName lastName email');
};

/**
 * Updates the status of a complaint.
 * @param {string} complaintId - The ID of the complaint.
 * @param {string} status - The new status.
 * @param {mongoose.Types.ObjectId} executiveUserId - ID of the executive updating the status.
 * @param {string} [resolutionDetails] - Optional details if status is 'Resolved' or 'Closed'.
 * @returns {Promise<Complaint>} - The updated complaint object.
 */
const updateComplaintStatus = async (complaintId, status, executiveUserId, resolutionDetails = '') => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new Error('Complaint not found.');
  }
  if (!COMPLAINT_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}.`);
  }

  const oldStatus = complaint.status;
  complaint.status = status;

  if (resolutionDetails && (status === 'Resolved' || status === 'Closed')) {
    complaint.resolutionDetails = resolutionDetails;
  }
  
  // Add an executive comment about the status change
  const commentText = `Status updated from "${oldStatus}" to "${status}". ${resolutionDetails ? 'Resolution: ' + resolutionDetails : ''}`.trim();
  complaint.executiveComments.push({
      comment: commentText,
      commentedBy: executiveUserId,
      timestamp: new Date()
  });

  // If status is 'Resolved' or 'Closed', and no 'assignedTo', assign to current exec
  if (!complaint.assignedTo && (status === 'Resolved' || status === 'Closed' || status === 'In Progress' || status === 'Under Review')) {
      complaint.assignedTo = executiveUserId;
  }


  await complaint.save();

  // TODO: Trigger notification to user about status update.
  // Example: await notificationService.triggerComplaintStatusUpdateNotification(complaint, oldStatus);

  return complaint;
};

/**
 * Adds an executive comment to a complaint.
 * @param {string} complaintId - The ID of the complaint.
 * @param {string} commentText - The comment text.
 * @param {mongoose.Types.ObjectId} executiveUserId - ID of the executive adding the comment.
 * @returns {Promise<Complaint>} - The updated complaint object.
 */
const addExecutiveComment = async (complaintId, commentText, executiveUserId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new Error('Complaint not found.');
  }

  complaint.executiveComments.push({
    comment: commentText,
    commentedBy: executiveUserId,
    timestamp: new Date(),
  });

  await complaint.save();

  // TODO: Trigger notification to user about new comment.
  // Example: await notificationService.triggerNewCommentOnComplaintNotification(complaint, commentText);

  return complaint;
};

/**
 * Assigns a complaint to an executive.
 * @param {string} complaintId - The ID of the complaint.
 * @param {mongoose.Types.ObjectId} executiveIdToAssign - ID of the executive to assign the complaint to.
 * @param {mongoose.Types.ObjectId} assigningExecutiveId - ID of the executive performing the assignment (for logging).
 * @returns {Promise<Complaint>} - The updated complaint object.
 */
const assignComplaintToExecutive = async (complaintId, executiveIdToAssign, assigningExecutiveId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new Error('Complaint not found.');
  }

  // Check if executiveIdToAssign is a valid executive (optional, depends on strictness)
  const targetExecutive = await User.findOne({ _id: executiveIdToAssign, role: { $in: [ROLES.EXECUTIVE, ROLES.SUPER_ADMIN]} });
  if (!targetExecutive) {
      throw new Error('Target user is not an Executive or Super Admin, or does not exist.');
  }
  
  const oldAssignee = complaint.assignedTo;
  complaint.assignedTo = executiveIdToAssign;

  // Add an executive comment about the assignment
  const commentText = `Complaint assigned to ${targetExecutive.firstName} ${targetExecutive.lastName} by user ${assigningExecutiveId}.`;
  complaint.executiveComments.push({
      comment: commentText,
      commentedBy: assigningExecutiveId, // The user making the assignment
      timestamp: new Date()
  });


  await complaint.save();

  // TODO: Trigger notification to the assigned executive.
  // Example: await notificationService.triggerComplaintAssignedNotification(complaint, executiveIdToAssign, oldAssignee);

  return complaint;
};


module.exports = {
  submitComplaint,
  getUserComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  addExecutiveComment,
  assignComplaintToExecutive,
};
