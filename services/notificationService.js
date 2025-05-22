const User = require('../models/userModel'); // Assuming path is correct
const NotificationLog = require('../models/notificationLogModel'); // Assuming path is correct
const emailService = require('./emailService');
const smsService = require('./smsService');
const pushNotificationService = require('./pushNotificationService'); // Placeholder
const { ROLES } = require('../utils/constants');

/**
 * Creates a notification log and attempts to send the notification.
 * @param {object} options - Notification options.
 * @param {mongoose.Types.ObjectId | string | null} options.userId - User ID if applicable.
 * @param {string} options.type - 'email', 'sms', 'push', 'in-app'.
 * @param {string} options.recipientAddress - Email, phone number, or device token.
 * @param {string} [options.subject] - Subject (for email).
 * @param {string} options.content - Main message content (HTML for email).
 * @param {string} [options.textBody] - Plain text body for email.
 * @param {object} [options.data] - Additional data for push notifications.
 */
const createAndSendNotification = async (options) => {
  const { userId, type, recipientAddress, subject, content, textBody, data } = options;

  // Log the attempt first (status will be 'queued' or 'failed' by the specific service)
  // The specific services (emailService, smsService) will handle their own logging for now.
  // This can be refactored later if a pre-send log entry is desired here.

  try {
    switch (type) {
      case 'email':
        if (!recipientAddress || !subject || !content) {
          throw new Error('Email requires recipientAddress, subject, and content.');
        }
        await emailService.sendEmail(recipientAddress, subject, content, textBody, userId);
        break;
      case 'sms':
        if (!recipientAddress || !content) {
          throw new Error('SMS requires recipientAddress and content.');
        }
        await smsService.sendSMS(recipientAddress, content, userId);
        break;
      case 'push':
        if (!userId || !subject || !content) { // Assuming subject for title
          throw new Error('Push notification requires userId, title (as subject), and content.');
        }
        await pushNotificationService.sendPushNotification(userId, subject, content, data);
        break;
      case 'in-app':
        // For in-app, we might just create a log or save to a different collection
        console.log(`In-app notification for User ${userId || 'system'}: ${content}`);
        await NotificationLog.create({
          user: userId,
          type: 'in-app',
          recipientAddress: userId ? userId.toString() : 'system', // Or specific in-app feed ID
          subject: subject, // Optional for in-app
          content: content,
          status: 'delivered', // In-app messages are typically 'delivered' once created
          sentAt: new Date(),
        });
        break;
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
  } catch (error)
  {
    console.error(`Failed to send ${type} notification to ${recipientAddress}:`, error);
    // Logging is handled by individual services, but if one service didn't log, this is a fallback.
    // However, this part might be redundant if individual services are robust in their logging.
    // Consider if a generic log entry here for "orchestration failed" is needed.
  }
};


/**
 * Triggers a welcome notification to a new user.
 * @param {object} user - The newly registered user object.
 */
const triggerWelcomeNotification = async (user) => {
  if (!user || !user.email) {
    console.error('Cannot send welcome email: User object or email missing.');
    return;
  }

  const subject = 'Welcome to the CDA Platform!';
  // Basic HTML template - consider using a template engine for more complex emails
  const htmlContent = `
    <h1>Welcome, ${user.firstName}!</h1>
    <p>Thank you for registering on the Community Development Association Platform.</p>
    <p>We're excited to have you on board.</p>
    <p>If you have any questions, feel free to reach out.</p>
    <br>
    <p>Best regards,</p>
    <p>The CDA Team</p>
  `;
  const textContent = `Welcome, ${user.firstName}! Thank you for registering on the CDA Platform.`;

  await createAndSendNotification({
    userId: user._id,
    type: 'email',
    recipientAddress: user.email,
    subject: subject,
    content: htmlContent,
    textBody: textContent,
  });

  // Optionally, send a welcome SMS if phone number exists and user opted-in (not implemented here)
  // if (user.phoneNumber && user.notificationPreferences && user.notificationPreferences.sms) {
  //   const smsMessage = `Welcome to the CDA Platform, ${user.firstName}!`;
  //   await createAndSendNotification({
  //     userId: user._id,
  //     type: 'sms',
  //     recipientAddress: user.phoneNumber,
  //     content: smsMessage,
  //   });
  // }
};

/**
 * Triggers a notification for a payment confirmation.
 * @param {object} paymentRecord - The confirmed payment record.
 */
const triggerPaymentConfirmedNotification = async (paymentRecord) => {
  if (!paymentRecord || !paymentRecord.user) {
    console.error('Cannot send payment confirmation: Payment record or user missing.');
    return;
  }

  const user = await User.findById(paymentRecord.user);
  if (!user) {
    console.error(`Cannot send payment confirmation: User with ID ${paymentRecord.user} not found.`);
    return;
  }

  const subject = `Payment Confirmation - Ref: ${paymentRecord.transactionReference}`;
  const receiptLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/payments/${paymentRecord._id}/receipt`; // Assuming a base URL
  
  const htmlContent = `
    <h1>Payment Confirmed!</h1>
    <p>Dear ${user.firstName},</p>
    <p>Your payment of ${paymentRecord.currency} ${paymentRecord.amount} for "${paymentRecord.paymentFor}" has been successfully confirmed.</p>
    <p>Transaction Reference: ${paymentRecord.transactionReference}</p>
    <p>Payment Method: ${paymentRecord.paymentMethod}</p>
    ${paymentRecord.flutterwaveTransactionId ? `<p>Flutterwave ID: ${paymentRecord.flutterwaveTransactionId}</p>` : ''}
    <p>You can download your receipt <a href="${receiptLink}">here</a>.</p>
    <br>
    <p>Thank you for your payment.</p>
    <p>The CDA Team</p>
  `;
  const textContent = `Dear ${user.firstName}, Your payment of ${paymentRecord.currency} ${paymentRecord.amount} for "${paymentRecord.paymentFor}" (Ref: ${paymentRecord.transactionReference}) has been confirmed. Download receipt: ${receiptLink}`;

  await createAndSendNotification({
    userId: user._id,
    type: 'email',
    recipientAddress: user.email,
    subject: subject,
    content: htmlContent,
    textBody: textContent,
  });

  // Optionally, send an SMS alert
  // if (user.phoneNumber && ...) {
  //   const smsMessage = `Payment Confirmed: ${paymentRecord.currency} ${paymentRecord.amount} for ${paymentRecord.paymentFor}. Ref: ${paymentRecord.transactionReference}. Thanks, CDA Team.`;
  //   await createAndSendNotification({ ... type: 'sms' ... });
  // }
};

/**
 * Triggers a notification for a membership application status update.
 * @param {object} application - The membership application object.
 * @param {string} newStatus - The new status ('approved', 'rejected').
 */
const triggerMembershipStatusUpdateNotification = async (application, newStatus) => {
  if (!application || !application.user) {
    console.error('Cannot send membership status update: Application or user missing.');
    return;
  }

  const user = await User.findById(application.user);
  if (!user) {
    console.error(`Cannot send membership status update: User with ID ${application.user} not found.`);
    return;
  }

  const subject = `Membership Application Status Update: ${newStatus.toUpperCase()}`;
  let htmlContent = `<h1>Membership Application Update</h1><p>Dear ${user.firstName},</p>`;
  htmlContent += `<p>Your application for <strong>${application.membershipTypeRequested}</strong> has been <strong>${newStatus}</strong>.</p>`;

  if (newStatus === 'approved') {
    htmlContent += `<p>Congratulations! Your membership is now active. You can access member benefits and features.</p>`;
    // Potentially include new role if changed:
    // const updatedUser = await User.findById(user._id); // Re-fetch user to get latest role
    // if (updatedUser && updatedUser.role !== user.role) { // If role changed during approval
    //    htmlContent += `<p>Your user role has been updated to: ${updatedUser.role}.</p>`;
    // }
  } else if (newStatus === 'rejected') {
    htmlContent += `<p>We regret to inform you that your application was not approved at this time.</p>`;
    if (application.comments) {
      htmlContent += `<p><strong>Reviewer Comments:</strong> ${application.comments}</p>`;
    }
    htmlContent += `<p>If you have questions or wish to reapply, please contact support.</p>`;
  }

  htmlContent += `<br><p>Best regards,</p><p>The CDA Membership Team</p>`;
  const textContent = `Dear ${user.firstName}, Your membership application for ${application.membershipTypeRequested} has been ${newStatus}. ${application.comments ? 'Comments: ' + application.comments : ''}`;

  await createAndSendNotification({
    userId: user._id,
    type: 'email',
    recipientAddress: user.email,
    subject: subject,
    content: htmlContent,
    textBody: textContent,
  });
};

module.exports = {
  createAndSendNotification,
  triggerWelcomeNotification,
  triggerPaymentConfirmedNotification,
  triggerMembershipStatusUpdateNotification,
};
