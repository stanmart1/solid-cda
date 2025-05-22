const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email', // Default to Ethereal for testing
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Ethereal username or your SMTP username
      pass: process.env.EMAIL_PASS, // Ethereal password or your SMTP password
    },
    from: process.env.EMAIL_FROM || '"CDA Platform" <noreply@example.com>', // Default sender address
  },
  sms: {
    // Using BulkSMS.com as an example. Replace with your provider's details.
    // For BulkSMS Nigeria (api.bulksmsnigeria.com) it might be token based.
    // For global BulkSMS (api.bulksms.com/v1/messages) it's username/password or token.
    // This example assumes a token-based API similar to BulkSMS Nigeria or a generic provider.
    apiKey: process.env.BULKSMS_API_KEY, // Or BULKSMS_TOKEN
    senderId: process.env.BULKSMS_SENDER_ID || 'CDA', // Default sender ID
    baseUrl: process.env.BULKSMS_BASE_URL || 'https://api.bulksmsnigeria.com/api/v1', // Example
    // If using username/password for other BulkSMS APIs:
    // username: process.env.BULKSMS_USERNAME,
    // password: process.env.BULKSMS_PASSWORD,
  },
  pushNotification: {
    // Firebase Cloud Messaging (FCM) placeholders
    fcmServerKey: process.env.FCM_SERVER_KEY,
    // Other push notification settings can go here
  },
  // Default notification preferences if user hasn't set any
  defaultPreferences: {
    email: true,
    sms: false, // SMS can be costly, so default to false
    inApp: true,
  },
};
