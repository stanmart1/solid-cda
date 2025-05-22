const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getMyComplaints,
  getAllComplaintsForExecutive,
  getComplaintDetails,
  updateComplaintStatusByExecutive,
  addCommentToComplaintByExecutive,
  assignComplaint,
  getComplaintCategoriesAndStatuses, // Added controller for this
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');
// const { uploadComplaintAttachment } = require('../middleware/uploadComplaintMiddleware'); // Placeholder for actual upload

// User routes
router.post(
  '/',
  protect,
  // uploadComplaintAttachment.array('attachments', 5), // Example for actual file upload, max 5 files
  createComplaint
);
router.get('/my-complaints', protect, getMyComplaints);
router.get('/:complaintId', protect, getComplaintDetails); // Controller handles ownership/role check

// Meta route for categories and statuses
router.get('/meta/categories-statuses', protect, getComplaintCategoriesAndStatuses);


// Executive/Admin routes
router.get(
  '/executive/all',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  getAllComplaintsForExecutive
);
router.put(
  '/executive/:complaintId/status',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  updateComplaintStatusByExecutive
);
router.post(
  '/executive/:complaintId/comment',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  addCommentToComplaintByExecutive
);
router.put(
  '/executive/:complaintId/assign',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  assignComplaint
);

module.exports = router;
