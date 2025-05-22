const asyncHandler = require('express-async-handler');
const complaintService = require('../services/complaintService');
const Complaint = require('../models/complaintModel'); // For direct access if needed, or to check ownership
const { ROLES, COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } = require('../utils/constants');
const mongoose = require('mongoose');

// @desc    User submits a new complaint
// @route   POST /api/complaints
// @access  Private (Authenticated User)
const createComplaint = asyncHandler(async (req, res) => {
  const { title, description, category, attachments } = req.body;
  const userId = req.user.id;

  if (!title || !description || !category) {
    res.status(400);
    throw new Error('Title, description, and category are required.');
  }
  if (!COMPLAINT_CATEGORIES.includes(category)) {
    res.status(400);
    throw new Error(`Invalid category: ${category}.`);
  }
  // Assuming attachments is an array of URLs if provided (no actual upload handling here)
  if (attachments && !Array.isArray(attachments)) {
      res.status(400);
      throw new Error('Attachments must be an array of URLs.');
  }

  const complaintData = { title, description, category, attachments };
  const complaint = await complaintService.submitComplaint(complaintData, userId);
  res.status(201).json(complaint);
});

// @desc    User views their submitted complaints
// @route   GET /api/complaints/my-complaints
// @access  Private (Authenticated User)
const getMyComplaints = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;
  const paginationOptions = { page, limit };

  const result = await complaintService.getUserComplaints(userId, paginationOptions);
  res.json(result);
});

// @desc    Fetches all complaints (Admin/Executive action)
// @route   GET /api/complaints/executive/all
// @access  Private (Super Admin, Executive)
const getAllComplaintsForExecutive = asyncHandler(async (req, res) => {
  const { status, category, assignedTo, userId, page, limit } = req.query; // Added userId for filtering by user
  const filters = { status, category, assignedTo, userId };
  const paginationOptions = { page, limit };

  const result = await complaintService.getAllComplaints(filters, paginationOptions);
  res.json(result);
});

// @desc    Fetches details of a specific complaint
// @route   GET /api/complaints/:complaintId
// @access  Private (User can view their own, Executive/Admin can view any)
const getComplaintDetails = asyncHandler(async (req, res) => {
  const complaintId = req.params.complaintId;
   if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      res.status(400);
      throw new Error('Invalid complaint ID format.');
  }

  const complaint = await complaintService.getComplaintById(complaintId);

  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found.');
  }

  // Check ownership or admin/exec role
  const isOwner = complaint.user._id.equals(req.user.id);
  const isAdminOrExecutive =
    req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.EXECUTIVE;

  if (!isOwner && !isAdminOrExecutive) {
    res.status(403);
    throw new Error('Not authorized to view this complaint.');
  }

  res.json(complaint);
});

// @desc    Updates status of a complaint (Admin/Executive action)
// @route   PUT /api/complaints/executive/:complaintId/status
// @access  Private (Super Admin, Executive)
const updateComplaintStatusByExecutive = asyncHandler(async (req, res) => {
  const complaintId = req.params.complaintId;
  const { status, resolutionDetails } = req.body;
  const executiveUserId = req.user.id;

  if (!status) {
    res.status(400);
    throw new Error('Status is required.');
  }
  if (!COMPLAINT_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status: ${status}.`);
  }
   if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      res.status(400);
      throw new Error('Invalid complaint ID format.');
  }


  const updatedComplaint = await complaintService.updateComplaintStatus(
    complaintId,
    status,
    executiveUserId,
    resolutionDetails
  );
  res.json(updatedComplaint);
});

// @desc    Adds an executive comment to a complaint (Admin/Executive action)
// @route   POST /api/complaints/executive/:complaintId/comment
// @access  Private (Super Admin, Executive)
const addCommentToComplaintByExecutive = asyncHandler(async (req, res) => {
  const complaintId = req.params.complaintId;
  const { comment } = req.body;
  const executiveUserId = req.user.id;

  if (!comment) {
    res.status(400);
    throw new Error('Comment text is required.');
  }
   if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      res.status(400);
      throw new Error('Invalid complaint ID format.');
  }

  const updatedComplaint = await complaintService.addExecutiveComment(
    complaintId,
    comment,
    executiveUserId
  );
  res.json(updatedComplaint);
});

// @desc    Assigns a complaint to an executive (Admin/Executive action)
// @route   PUT /api/complaints/executive/:complaintId/assign
// @access  Private (Super Admin, Executive)
const assignComplaint = asyncHandler(async (req, res) => {
  const complaintId = req.params.complaintId;
  const { executiveIdToAssign } = req.body; // ID of the executive to assign to
  const assigningExecutiveId = req.user.id; // ID of the executive performing assignment

  if (!executiveIdToAssign) {
    res.status(400);
    throw new Error('executiveIdToAssign is required.');
  }
  if (!mongoose.Types.ObjectId.isValid(executiveIdToAssign)) {
      res.status(400);
      throw new Error('Invalid executiveIdToAssign format.');
  }
   if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      res.status(400);
      throw new Error('Invalid complaint ID format.');
  }


  const updatedComplaint = await complaintService.assignComplaintToExecutive(
    complaintId,
    executiveIdToAssign,
    assigningExecutiveId
  );
  res.json(updatedComplaint);
});

// @desc    Get predefined complaint categories and statuses
// @route   GET /api/complaints/meta/categories-statuses
// @access  Private (Authenticated users)
const getComplaintCategoriesAndStatuses = asyncHandler(async (req, res) => {
    res.json({
        categories: COMPLAINT_CATEGORIES,
        statuses: COMPLAINT_STATUSES
    });
});


module.exports = {
  createComplaint,
  getMyComplaints,
  getAllComplaintsForExecutive,
  getComplaintDetails,
  updateComplaintStatusByExecutive,
  addCommentToComplaintByExecutive,
  assignComplaint,
  getComplaintCategoriesAndStatuses, // Added helper
};
