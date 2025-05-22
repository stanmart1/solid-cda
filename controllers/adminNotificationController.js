const asyncHandler = require('express-async-handler');
const notificationService = require('../services/notificationService');
const User = require('../models/userModel'); // To fetch users by role or email
const { ROLES } = require('../utils/constants');

// @desc    Admin sends a custom email to a user or group of users by role
// @route   POST /api/admin/notifications/email
// @access  Private (Super Admin, Executive)
const adminSendEmail = asyncHandler(async (req, res) => {
  const { recipientType, recipientValue, subject, htmlBody, textBody } = req.body;
  // recipientType: 'email', 'role'
  // recipientValue: an email address, or a role like 'Tenant'

  if (!recipientType || !recipientValue || !subject || !htmlBody) {
    res.status(400);
    throw new Error('Recipient type, value, subject, and HTML body are required.');
  }

  let recipients = [];

  if (recipientType === 'email') {
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientValue)) {
        res.status(400);
        throw new Error('Invalid email address format provided for recipientValue.');
    }
    recipients.push({ email: recipientValue, _id: null }); // _id null as user might not be in DB
  } else if (recipientType === 'role') {
    if (!Object.values(ROLES).includes(recipientValue) && recipientValue !== 'all') {
        res.status(400);
        throw new Error(`Invalid role specified: ${recipientValue}. Must be one of ${Object.values(ROLES).join(', ')} or 'all'.`);
    }
    const query = recipientValue === 'all' ? { isActive: true } : { role: recipientValue, isActive: true };
    const users = await User.find(query).select('email _id firstName');
    if (!users || users.length === 0) {
      res.status(404);
      throw new Error(`No users found with role: ${recipientValue}`);
    }
    recipients = users;
  } else {
    res.status(400);
    throw new Error("Invalid recipientType. Must be 'email' or 'role'.");
  }

  let successCount = 0;
  let failureCount = 0;
  const results = [];

  for (const recipient of recipients) {
    try {
      await notificationService.createAndSendNotification({
        userId: recipient._id, // Can be null if direct email not tied to a DB user
        type: 'email',
        recipientAddress: recipient.email,
        subject: subject,
        content: htmlBody,
        textBody: textBody || htmlBody.replace(/<[^>]+>/g, ''), // Simple text version
      });
      successCount++;
      results.push({ email: recipient.email, status: 'success' });
    } catch (error) {
      failureCount++;
      results.push({ email: recipient.email, status: 'failed', error: error.message });
      console.error(`Failed to send custom email to ${recipient.email}:`, error);
    }
  }

  res.status(200).json({
    message: `Emails processed. Success: ${successCount}, Failures: ${failureCount}.`,
    results,
  });
});

// @desc    Admin sends a custom SMS to a user or group of users by role
// @route   POST /api/admin/notifications/sms
// @access  Private (Super Admin, Executive)
const adminSendSMS = asyncHandler(async (req, res) => {
  const { recipientType, recipientValue, message } = req.body;
  // recipientType: 'phoneNumber', 'role'
  // recipientValue: a phone number, or a role like 'Tenant'

  if (!recipientType || !recipientValue || !message) {
    res.status(400);
    throw new Error('Recipient type, value, and message are required.');
  }

  let recipients = [];

  if (recipientType === 'phoneNumber') {
    // Basic phone number validation (very simple, consider a library for real validation)
    if (!/^\+?[0-9\s\-()]{7,15}$/.test(recipientValue)) {
        res.status(400);
        throw new Error('Invalid phone number format provided for recipientValue.');
    }
    recipients.push({ phoneNumber: recipientValue, _id: null });
  } else if (recipientType === 'role') {
     if (!Object.values(ROLES).includes(recipientValue) && recipientValue !== 'all') {
        res.status(400);
        throw new Error(`Invalid role specified: ${recipientValue}. Must be one of ${Object.values(ROLES).join(', ')} or 'all'.`);
    }
    const query = recipientValue === 'all' ? { isActive: true, phoneNumber: { $ne: null } } : { role: recipientValue, isActive: true, phoneNumber: { $ne: null } };
    const users = await User.find(query).select('phoneNumber _id firstName');
    if (!users || users.length === 0) {
      res.status(404);
      throw new Error(`No users with phone numbers found for role: ${recipientValue}`);
    }
    recipients = users;
  } else {
    res.status(400);
    throw new Error("Invalid recipientType. Must be 'phoneNumber' or 'role'.");
  }

  let successCount = 0;
  let failureCount = 0;
  const results = [];

  for (const recipient of recipients) {
    if (!recipient.phoneNumber) { // Skip if user from role search has no phone number
        failureCount++;
        results.push({ target: recipient._id || recipientValue, status: 'skipped', reason: 'No phone number available' });
        continue;
    }
    try {
      // The smsService.sendSMS returns an object like { success: boolean, message: string }
      const smsResult = await notificationService.createAndSendNotification({
        userId: recipient._id,
        type: 'sms',
        recipientAddress: recipient.phoneNumber,
        content: message,
      });
      // Assuming createAndSendNotification doesn't throw for SMS but relies on smsService's return
      // This part needs alignment with how smsService reports success/failure
      // For now, let's assume if it doesn't throw, it's logged.
      // The actual success/failure of SMS delivery is complex and often asynchronous.
      // The log in NotificationLog would reflect 'queued' or 'failed' based on API response.
      // Here, we are just noting that the attempt was made.
      successCount++; // Assume attempt is success for now, check NotificationLog for actual status
      results.push({ phoneNumber: recipient.phoneNumber, status: 'attempted' });

    } catch (error) { // If createAndSendNotification itself throws
      failureCount++;
      results.push({ phoneNumber: recipient.phoneNumber, status: 'failed', error: error.message });
      console.error(`Failed to send custom SMS to ${recipient.phoneNumber}:`, error);
    }
  }

  res.status(200).json({
    message: `SMS processed. Attempts: ${successCount}, Failures/Skipped: ${failureCount}. Check notification logs for delivery status.`,
    results,
  });
});

module.exports = {
  adminSendEmail,
  adminSendSMS,
};
