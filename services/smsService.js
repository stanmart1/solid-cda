const axios = require('axios');
const notificationConfig = require('../config/notificationConfig');
const NotificationLog = require('../models/notificationLogModel'); // Assuming path is correct

// Create an axios instance for BulkSMS API
// The configuration here is a generic example.
// You'll need to adjust it based on the specific BulkSMS provider (e.g., BulkSMS.com, BulkSMSNigeria.com)
const smsApiClient = axios.create({
  baseURL: notificationConfig.sms.baseUrl,
  // Headers might vary based on the provider
  // For BulkSMSNigeria.com, it might be 'ApiToken' in headers or 'api_token' in query/body
  // For BulkSMS.com, it might be Basic Auth (username/password) or an API token.
  // This example assumes a token in the query params or body, which is common.
  // If token is in header:
  // headers: {
  //   'Authorization': `Bearer ${notificationConfig.sms.apiKey}`, // or 'Basic ' + base64(user:pass)
  //   'Content-Type': 'application/json', // Or 'application/x-www-form-urlencoded'
  //   'Accept': 'application/json'
  // }
});

/**
 * Sends an SMS using the configured SMS provider.
 * @param {string} phoneNumber - The recipient's phone number (international format preferred).
 * @param {string} message - The message content.
 * @param {mongoose.Types.ObjectId | null} userId - Optional ID of the user this SMS is for.
 * @returns {Promise<object>} - The response from the SMS gateway.
 */
const sendSMS = async (phoneNumber, message, userId = null) => {
  let logStatus = 'queued';
  let sentAt;
  let errorMessage;

  // Basic validation
  if (!notificationConfig.sms.apiKey || !notificationConfig.sms.baseUrl) {
    errorMessage = 'SMS service is not configured (API key or Base URL missing).';
    console.error(errorMessage);
    logStatus = 'failed';
    await NotificationLog.create({
      user: userId,
      type: 'sms',
      recipientAddress: phoneNumber,
      content: message,
      status: logStatus,
      errorMessage: errorMessage,
    });
    // Do not throw an error here, as we want to log it and continue,
    // but the caller should be aware that SMS was not sent.
    return { success: false, message: errorMessage };
  }

  // Payload structure depends heavily on the SMS provider
  // Example for BulkSMSNigeria.com (check their latest API docs)
  const payload = {
    api_token: notificationConfig.sms.apiKey,
    to: phoneNumber,
    from: notificationConfig.sms.senderId,
    body: message,
    // dnd: 2, // Optional: 1 for DND override, 2 for no DND override
  };

  // Example for a more generic provider (like ClickSend or Twilio if using their direct HTTP API)
  // const genericPayload = {
  //   to: phoneNumber,
  //   from: notificationConfig.sms.senderId, // May not be supported by all, or may need pre-registration
  //   message: message,
  // };

  try {
    // The actual request might be POST or GET depending on the provider
    // For BulkSMSNigeria, it's typically a POST request with x-www-form-urlencoded or application/json
    // This example uses POST with JSON payload.
    const response = await smsApiClient.post('/json', payload, { // Endpoint might be /send, /messages, /json etc.
        headers: { 'Content-Type': 'application/json' } // Or application/x-www-form-urlencoded
    });
    // const response = await smsApiClient.get('/send', { params: payload }); // If GET request

    console.log('SMS API Response:', response.data);

    // Success condition depends on API response structure
    // For BulkSMSNigeria, a status "OK" or a specific code might indicate success.
    // Example: if (response.data && (response.data.status === "OK" || response.data.data.status === "success"))
    if (response.data && (response.data.status === "OK" || (response.data.data && response.data.data.status === "success"))) {
      logStatus = 'sent'; // Or 'queued' if API only queues it
      sentAt = new Date();
      console.log(`SMS supposedly sent to ${phoneNumber}.`);
    } else {
      logStatus = 'failed';
      errorMessage = response.data.message || JSON.stringify(response.data); // Capture error from API
      console.error(`Failed to send SMS to ${phoneNumber}: ${errorMessage}`);
    }

    await NotificationLog.create({
      user: userId,
      type: 'sms',
      recipientAddress: phoneNumber,
      content: message,
      status: logStatus,
      sentAt: sentAt,
      errorMessage: errorMessage,
    });
    return { success: logStatus === 'sent', data: response.data, message: errorMessage };
  } catch (error) {
    console.error('Error sending SMS:', error.response ? error.response.data : error.message);
    logStatus = 'failed';
    errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    await NotificationLog.create({
      user: userId,
      type: 'sms',
      recipientAddress: phoneNumber,
      content: message,
      status: logStatus,
      errorMessage: errorMessage,
    });
    // Do not re-throw, allow application to continue. Caller checks 'success' field.
    return { success: false, message: errorMessage, error: error };
  }
};

module.exports = {
  sendSMS,
};
