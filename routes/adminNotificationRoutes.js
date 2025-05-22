const express = require('express');
const router = express.Router();
const {
  adminSendEmail,
  adminSendSMS,
} = require('../controllers/adminNotificationController');
const { authorize } = require('../middleware/authMiddleware'); // authorize includes protect
const { ROLES } = require('../utils/constants');

// @route   POST /api/admin/notifications/email
// @desc    Admin sends a custom email
// @access  Private (Super Admin, Executive)
router.post(
  '/email',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  adminSendEmail
);

// @route   POST /api/admin/notifications/sms
// @desc    Admin sends a custom SMS
// @access  Private (Super Admin, Executive)
router.post(
  '/sms',
  authorize([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]),
  adminSendSMS
);

module.exports = router;
