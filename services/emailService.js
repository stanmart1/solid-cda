const nodemailer = require('nodemailer');
const notificationConfig = require('../config/notificationConfig');
const NotificationLog = require('../models/notificationLogModel'); // Assuming path is correct

// Create a Nodemailer transporter using SMTP
const transporter = nodemailer.createTransport({
  host: notificationConfig.email.host,
  port: notificationConfig.email.port,
  secure: notificationConfig.email.secure, // true for 465, false for other ports
  auth: {
    user: notificationConfig.email.auth.user,
    pass: notificationConfig.email.auth.pass,
  },
  // For testing with Ethereal, if self-signed certs issue:
  // tls: {
  //   rejectUnauthorized: false
  // }
});

/**
 * Sends an email using Nodemailer.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} htmlBody - The HTML body of the email.
 * @param {string} textBody - Optional plain text body of the email.
 * @param {mongoose.Types.ObjectId | null} userId - Optional ID of the user this email is for.
 * @returns {Promise<object>} - The result from Nodemailer's sendMail.
 */
const sendEmail = async (to, subject, htmlBody, textBody = '', userId = null) => {
  const mailOptions = {
    from: notificationConfig.email.from,
    to: to, // Recipient email address
    subject: subject,
    text: textBody || htmlBody.replace(/<[^>]+>/g, ''), // Simple conversion if no textBody
    html: htmlBody,
  };

  let logStatus = 'queued';
  let sentAt;
  let errorMessage;

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    // For Ethereal: Preview URL
    if (notificationConfig.email.host === 'smtp.ethereal.email') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    logStatus = 'sent';
    sentAt = new Date();
    // Save to NotificationLog
    await NotificationLog.create({
      user: userId,
      type: 'email',
      recipientAddress: to,
      subject: subject,
      content: htmlBody, // Storing HTML content
      status: logStatus,
      sentAt: sentAt,
    });
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    logStatus = 'failed';
    errorMessage = error.message;
    // Save error to NotificationLog
    await NotificationLog.create({
      user: userId,
      type: 'email',
      recipientAddress: to,
      subject: subject,
      content: htmlBody,
      status: logStatus,
      errorMessage: errorMessage,
    });
    throw error; // Re-throw error to be handled by caller
  }
};

module.exports = {
  sendEmail,
  transporter, // Export transporter for potential direct use or testing
};
